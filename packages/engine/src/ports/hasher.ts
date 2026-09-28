export type Hasher = {
  sha256: (input: string) => Promise<string>;
};
