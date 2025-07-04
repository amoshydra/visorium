const isDemo = import.meta.env.VITE_VISORIUM_MODE === "demo";

const id = isDemo ? "demo" : "default";

const { useFileServerSocket } = await import(`./useFileServerSocket/${id}.ts`);
export { useFileServerSocket };
