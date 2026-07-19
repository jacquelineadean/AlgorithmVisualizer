// Blog registry: every .mdx file in ./posts self-describes via its exported
// `meta` and renders as a component (Phase 2d — MDX pipeline).

const modules = import.meta.glob('./posts/*.mdx', { eager: true });

export const POSTS = Object.values(modules)
    .map((module) => ({ ...module.meta, Component: module.default }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

export const getPost = (slug) => POSTS.find((post) => post.slug === slug);
