import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNesting from "postcss-nesting";
import tailwindcss from "tailwindcss";

export default {
	plugins: [postcssImport(), postcssNesting(), tailwindcss(), autoprefixer()],
};
