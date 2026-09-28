import { ApiError } from "@remcostoeten/analytics-contract";

export const errorResponses = {
  400: ApiError,
  401: ApiError,
  403: ApiError,
  404: ApiError,
  409: ApiError,
  500: ApiError,
  503: ApiError,
};
