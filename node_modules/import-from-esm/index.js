import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageResolve } from './lib/import-meta-resolve/resolve.js';

function resolveToFileURL(...paths) {
	return pathToFileURL(resolve(...paths));
}

async function tryImport(moduleId) {
	try {
		return await import(moduleId);
	} catch {}
}

async function importFrom(fromDirectory, moduleId) {
	let loadedModule;

	// https://nodejs.org/api/modules.html#file-modules
	// if moduleId begins with '/', '../', or './'
	if (/^(\/|\.\.\/|\.\/)/.test(moduleId)) {
		const localModulePath = resolveToFileURL(fromDirectory, moduleId);

		// Try to resolve exact file path
		loadedModule = await tryImport(localModulePath);

		if (!loadedModule) {
			// Try to resolve file path with added extensions
			const extensions = ['.js', '.mjs', '.cjs'];

			for (const ext of extensions) {
				// eslint-disable-next-line no-await-in-loop
				loadedModule = await tryImport(`${localModulePath}${ext}`);
				if (loadedModule) {
					break;
				}
			}
		}
	}

	// https://nodejs.org/api/modules.html#loading-from-node_modules-folders
	// try to resolve from built-in or npm modules
	if (!loadedModule) {
		try {
			const parentModulePath = resolveToFileURL(fromDirectory, 'noop.js');
			loadedModule = await import(packageResolve(moduleId, parentModulePath, new Set(['node', 'import'])));
		} catch {}
	}

	if (!loadedModule) {
		const error = new Error(`Cannot find module '${moduleId}'`);
		error.code = 'MODULE_NOT_FOUND';
		throw error;
	}

	return loadedModule.default;
}

importFrom.silent = async function (fromDirectory, moduleId) {
	try {
		return await importFrom(fromDirectory, moduleId);
	} catch {}
};

export default importFrom;
