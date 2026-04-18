# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploying to Render

1. **Set up a new Static Site on Render**
   - Connect your GitHub repo.
   - Set the build command to:
     ```sh
     ./render-build.sh
     ```
   - Set the publish directory to:
     ```
     dist
     ```

2. **Environment Variables**
   - If your frontend needs to know the backend API URL, set:
     ```
     VITE_API_URL=https://queryflowbackend.onrender.com
     ```
   - In your frontend code, use `import.meta.env.VITE_API_URL` for API calls (or update your axios/fetch base URL accordingly).

3. **Proxy (Development Only)**
   - The Vite proxy in `vite.config.js` is only for local development. In production, your frontend will call the deployed backend directly.

4. **Build Output**
   - The production build will be served from the `dist` directory.
