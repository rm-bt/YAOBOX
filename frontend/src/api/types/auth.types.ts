export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = {
  full_name: string;
  email: string;
  password: string;
};

export type RegisterRequest = RegisterFormValues;

export type TokenResponse = {
  access_token: string;
  token_type: string;
};