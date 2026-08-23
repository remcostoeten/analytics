export async function loadModule<TModule>(loader: () => Promise<TModule>): Promise<TModule | null> {
	try {
		return await loader();
	} catch {
		return null;
	}
}
