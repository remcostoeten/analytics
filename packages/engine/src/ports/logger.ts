export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = { [field: string]: string | number | boolean | null };

export type LogEntry = {
  level: LogLevel;
  message: string;
  fields: LogFields;
};

type Log = (message: string, fields?: LogFields) => void;

export type Logger = {
  debug: Log;
  info: Log;
  warn: Log;
  error: Log;
};
