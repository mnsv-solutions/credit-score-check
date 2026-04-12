export const CreditScoreCheckSchema = {
  body: {
    type: 'object',
    required: ['applicationNumber', 'sin', 'dateOfBirth', 'firstName', 'lastName', 'consent'],
    properties: {
      applicationNumber: { 
        type: 'string', 
        pattern: '^APPL\\d{10}$' 
      },
      sin: { 
        type: 'string', 
        pattern: '^\\d{9}$' 
      },
      dateOfBirth: { 
        type: 'string', 
        format: 'date'
      },
      firstName: { 
        type: 'string', 
        minLength: 1 
      },
      lastName: { 
        type: 'string', 
        minLength: 1 
      },
      consent: { 
        type: 'boolean' 
      },
      checkedBy: {
        type: 'string',
      }
    },
  },
};

export interface CreditScoreCheckRequest {
  applicationNumber: string;
  sin: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  consent: boolean;
  checkedBy: string;
}