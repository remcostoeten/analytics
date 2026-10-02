export const maxEventsPerBatch = 50;
export const maxBodyBytes = 60 * 1024;
export const maxGroups = 5;
export const maxGroupId = 128;
// A group type: a lowercase letter, then up to 31 lowercase letters, digits or underscores.
export const groupTypePattern = "^[a-z][a-z0-9_]{0,31}$";
