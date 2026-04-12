import type { FastifyInstance } from 'fastify';
import {
  CreditScoreCheckSchema,
  type CreditScoreCheckRequest,
} from '../schemas/credit-check.schema.js';
import { validateAdult } from '../hooks/adult.hooks.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { CreditScoreResponseDto } from '../dto/credit-check.dto.js';
import { PrismaService } from '../database.js';

const prismaSvc = new PrismaService();

// Describes the CIBIL report shape returned with all related data
type CibilReportWithRelations = {
  cibil_report_id: string;
  application_id: string;
  request_id: string;
  reference_id: string;
  bureau: string;
  report_date: Date;
  status: string;
  cibil_score: number;
  score_band: string;
  risk_level: string;
  score_version: string;
  total_accounts: number;
  active_accounts: number;
  closed_accounts: number;
  total_outstanding_balance: unknown;
  secured_loan_accounts: number;
  unsecured_loan_accounts: number;
  total_missed_payments: number;
  recent_delinquency: boolean;
  credit_utilization_ratio: unknown;
  average_account_age_years: unknown;
  debt_to_income_estimate: unknown;
  cibil_applicants: {
    first_name: string;
    last_name: string;
    date_of_birth: Date;
    sin_number: string;
    mobile_number: string;
  } | null;
  cibil_accounts: Array<{
    account_type: string;
    lender_name: string;
    account_number_masked: string;
    ownership_type: string;
    open_date: Date;
    current_balance: unknown;
    credit_limit: unknown | null;
    payment_status: string;
    days_past_due: number;
  }>;
  cibil_payment_history: Array<{
    month_index: number;
    status_code: string;
  }>;
  cibil_enquiries: Array<{
    enquiry_date: Date;
    institution: string;
    enquiry_type: string;
  }>;
  cibil_risk_indicators: {
    high_credit_utilization: boolean;
    recent_hard_enquiries: boolean;
    thin_file: boolean;
    credit_mix_healthy: boolean;
  } | null;
};

export async function creditCheck(fastify: FastifyInstance) {
  fastify.post<{ Body: CreditScoreCheckRequest }>(
    '/credit-score/check',
    {
      schema: CreditScoreCheckSchema,
      preHandler: [validateAdult],
    },
    async (req, res) => {
      const { applicationNumber, sin, dateOfBirth, firstName, lastName, consent, checkedBy } =
        req.body;

      // Checks if the applicant has given consent to perform the credit score check
      if (!consent) {
        return res.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Consent is required to perform a credit check.',
        });
      }

      // Finds the active loan application using the application number
      const application = await prismaSvc.loan_application.findFirst({
        where: {
          application_number: applicationNumber,
          is_active: true,
        },
        select: {
          application_id: true,
          application_number: true,
          status_id: true,
        },
      });

      if (!application) {
        return res.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Loan application not found.',
        });
      }

      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();

      // Looks for a matching CIBIL report using application and applicant details
      const cibilReport = (await prismaSvc.cibil_reports.findFirst({
        where: {
          application_id: application.application_id,
          cibil_applicants: {
            is: {
              sin_number: sin,
              date_of_birth: new Date(dateOfBirth),
              first_name: normalizedFirstName,
              last_name: normalizedLastName,
            },
          },
        },
        include: {
          cibil_applicants: true,
          cibil_accounts: {
            orderBy: {
              open_date: 'asc',
            },
          },
          cibil_payment_history: {
            orderBy: {
              month_index: 'asc',
            },
          },
          cibil_enquiries: {
            orderBy: {
              enquiry_date: 'desc',
            },
          },
          cibil_risk_indicators: true,
        },
      })) as CibilReportWithRelations | null;

      // Marks earlier latest credit checks as no longer latest
      await prismaSvc.application_credit_check.updateMany({
        where: {
          application_id: application.application_id,
          is_latest: true,
        },
        data: {
          is_latest: false,
        },
      });

      // Saves a not found result when no matching CIBIL report is available
      if (!cibilReport) {
        const notFoundCheck = await prismaSvc.application_credit_check.create({
          data: {
            application_id: application.application_id,
            bureau_name: 'CIBIL',
            bureau_status: 'NOT_FOUND',
            checked_by: checkedBy,
            remarks: 'No matching CIBIL record found',
            raw_response: Prisma.JsonNull,
            is_latest: true,
          },
        });

        return notFoundCheck as CreditScoreResponseDto;
      }

      // Builds the JSON payload that will be stored as raw bureau response
      const rawResponse = buildRawResponse(cibilReport);

      // Fetches the application status to apply after a successful credit check
      const status = await prismaSvc.application_status.findFirst({
        where: {
          status_code: 'CREDIT_CHECK_COMPLETED',
          is_active: true,
        },
        select: {
          status_id: true,
        },
      });

      if (!status) {
        return res.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Application status CREDIT_CHECK_COMPLETED not found',
        });
      }

      // Creates the credit check record and updates the application in one transaction
      const [createdCheck] = await prismaSvc.$transaction([
        prismaSvc.application_credit_check.create({
          data: {
            application_id: application.application_id,
            cibil_report_id: cibilReport.cibil_report_id,
            request_id: cibilReport.request_id,
            bureau_name: cibilReport.bureau,
            bureau_reference_id: cibilReport.reference_id,
            bureau_status: cibilReport.status,
            credit_score: cibilReport.cibil_score,
            score_band: cibilReport.score_band,
            risk_level: cibilReport.risk_level,
            checked_by: checkedBy,
            remarks: 'Credit score fetched successfully from mock CIBIL tables',
            raw_response: rawResponse,
            is_latest: true,
          },
        }),
        prismaSvc.loan_application.update({
          where: {
            application_id: application.application_id,
          },
          data: {
            status_id: status.status_id,
            updated_by: checkedBy,
          },
        }),
      ]);

      console.log(
        `Credit score check completed successfully for application with ID: ${application.application_id}`,
      );

      return createdCheck as CreditScoreResponseDto;
    },
  );
}

function buildRawResponse(cibilReport: CibilReportWithRelations) {
  // Short references for nested report sections
  const applicant = cibilReport.cibil_applicants;
  const riskIndicators = cibilReport.cibil_risk_indicators;

  // Converts database data into a clean JSON structure for storage
  return {
    // Header section containing request ID, reference ID, bureau, report date, and status
    header: {
      requestId: cibilReport.request_id,
      referenceId: cibilReport.reference_id,
      bureau: cibilReport.bureau,
      reportDate: cibilReport.report_date.toISOString(),
      status: cibilReport.status,
    },

    // Applicant section containing first name, last name, date of birth, SIN, mobile number
    applicant: {
      firstName: applicant?.first_name ?? null,
      lastName: applicant?.last_name ?? null,
      dateOfBirth: applicant ? toDateOnly(applicant.date_of_birth) : null,
      sin: applicant?.sin_number ?? null,
      mobileNumber: applicant?.mobile_number ?? null,
    },

    // Score section containing CIBIL score, score band, risk level, and score version
    score: {
      cibilScore: cibilReport.cibil_score,
      scoreBand: cibilReport.score_band,
      riskLevel: cibilReport.risk_level,
      scoreVersion: cibilReport.score_version,
    },

    // Summary section containing total accounts, active accounts, closed accounts, total outstanding balance, secured loan accounts, unsecured loan accounts
    summary: {
      totalAccounts: cibilReport.total_accounts,
      activeAccounts: cibilReport.active_accounts,
      closedAccounts: cibilReport.closed_accounts,
      totalOutstandingBalance: toNumber(cibilReport.total_outstanding_balance),
      securedLoanAccounts: cibilReport.secured_loan_accounts,
      unsecuredLoanAccounts: cibilReport.unsecured_loan_accounts,
    },

    // Accounts section containing an array of account objects
    accounts: cibilReport.cibil_accounts.map((account) => ({
      // Account object containing account type, lender name, account number masked, ownership type, open date, current balance, credit limit, payment status, and days past due
      accountType: account.account_type,
      lenderName: account.lender_name,
      accountNumberMasked: account.account_number_masked,
      ownershipType: account.ownership_type,
      openDate: toDateOnly(account.open_date),
      currentBalance: toNumber(account.current_balance),
      creditLimit: toNullableNumber(account.credit_limit),
      paymentStatus: account.payment_status,
      daysPastDue: account.days_past_due,
    })),

    // Payment history section containing an array of payment history objects and total missed payments
    paymentHistory: {
      last12Months: cibilReport.cibil_payment_history.map((history) => history.status_code),
      totalMissedPayments: cibilReport.total_missed_payments,
      recentDelinquency: cibilReport.recent_delinquency,
    },

    // Enquiries section containing an array of enquiry objects
    enquiries: cibilReport.cibil_enquiries.map((enquiry) => ({
      // Enquiry object containing date, institution, and type
      date: toDateOnly(enquiry.enquiry_date),
      institution: enquiry.institution,
      type: enquiry.enquiry_type,
    })),

    // Risk indicators section containing high credit utilizationization, recent hard enquiries, thin file, credit mix healthy, and high credit utilizationization ratio
    riskIndicators: {
      highCreditUtilization: riskIndicators?.high_credit_utilization ?? false,
      recentHardEnquiries: riskIndicators?.recent_hard_enquiries ?? false,
      thinFile: riskIndicators?.thin_file ?? false,
      creditMixHealthy: riskIndicators?.credit_mix_healthy ?? false,
    },

    // Derived metrics section containing credit utilizationization ratio, average account age years, debt to income estimate
    derivedMetrics: {
      creditUtilizationRatio: toNumber(cibilReport.credit_utilization_ratio),
      averageAccountAgeYears: toNumber(cibilReport.average_account_age_years),
      debtToIncomeEstimate: toNumber(cibilReport.debt_to_income_estimate),
    },
  } satisfies Prisma.InputJsonObject;
}

function toNumber(value: unknown): number {
  // Returns 0 when the value is missing
  if (value === null || value === undefined) {
    return 0;
  }

  // Tries to convert the incoming value into a number
  const parsedValue = Number(value);

  // Falls back to 0 if conversion fails
  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  // Returns the converted number
  return parsedValue;
}

function toNullableNumber(value: unknown): number | null {
  // If the value is null or undefined, return null
  if (value === null || value === undefined) {
    return null;
  }

  // Tries to convert the incoming value into a number
  const parsedValue = Number(value);

  // If the conversion fails, return null
  if (Number.isNaN(parsedValue)) {
    return null;
  }

  // If the conversion is successful, return the resulting number
  return parsedValue;
}

function toDateOnly(value: Date): string {
  // If the value is null or undefined, return an empty string
  if (value === null || value === undefined) {
    return '';
  }

  // Split the ISO string into two parts: the date part and the time part
  const splitString = value.toISOString().split('T');

  // Return the date part in YYYY-MM-DD format
  return splitString[0] ?? '';
}
