export type CreditScoreResponseDto = {
  credit_check_id: string;
  application_id: string;
  cibil_report_id: string | null;
  request_id: string | null;
  bureau_name: string;
  bureau_reference_id: string | null;
  bureau_status: string;
  credit_score: number | null;
  score_band: string | null;
  risk_level: string | null;
  checked_at: Date;
  checked_by: string | null;
  remarks: string | null;
  raw_response: unknown | null;
  is_latest: boolean;
  created_at: Date;
  updated_at: Date;
}
