export async function loadModule<TModule>(specifier: string): Promise<TModule | null> {
	try {
		const loaded = await import(specifier);
		return loaded as TModule;
	} catch {
		return null;
	}
}
