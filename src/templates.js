const _ = require("lodash");
const Eta = require("eta");
const { getFileContent, pathIsExist } = require("./files");
const { config } = require("./config");
const { resolve } = require("path");

/**
 * name - project template name,
 * fileName - template file name,
 */
const TEMPLATE_INFOS = [
  { name: "api", fileName: "api.eta" },
  { name: "dataContracts", fileName: "data-contracts.eta" },
  { name: "httpClient", fileName: "http-client.eta" },
  { name: "routeTypes", fileName: "route-types.eta" },
  { name: "routeName", fileName: "route-name.eta" },
];

const getTemplatePaths = ({ templates, modular }) => {
  const baseTemplatesPath = resolve(__dirname, "../templates/base");
  const defaultTemplatesPath = resolve(__dirname, "../templates/default");
  const modularTemplatesPath = resolve(__dirname, "../templates/modular");
  const originalTemplatesPath = modular ? modularTemplatesPath : defaultTemplatesPath;
  const customTemplatesPath = templates ? resolve(process.cwd(), templates) : originalTemplatesPath;

  return {
    /** `templates/base` */
    base: baseTemplatesPath,
    /** `templates/default` */
    default: defaultTemplatesPath,
    /** `templates/modular` */
    modular: modularTemplatesPath,
    /** usage path if `--templates` option is not set */
    original: originalTemplatesPath,
    /** custom path to templates (`--templates`) */
    custom: customTemplatesPath,
  };
};

const getTemplates = ({ templatePaths }) => {
  if (!config.silent)
    console.log(`✨ try to read templates from directory "${templatePaths.custom}"`);

  const templatesMap = _.reduce(
    TEMPLATE_INFOS,
    (acc, { fileName, name }) => {
      const customFullPath = resolve(templatePaths.custom, "./", fileName);
      let fileContent = pathIsExist(customFullPath) && getFileContent(customFullPath);

      if (!fileContent) {
        const baseFullPath = resolve(templatePaths.base, "./", fileName);
        const originalFullPath = resolve(templatePaths.original, "./", fileName);

        if (pathIsExist(baseFullPath)) {
          fileContent = getFileContent(baseFullPath);
        } else {
          if (!config.silent)
            console.log(
              `❗❗❗ ${_.lowerCase(name)} template not found in ${customFullPath}\n` +
                `Code generator will use the default template`,
            );
        }

        if (pathIsExist(originalFullPath)) {
          fileContent = getFileContent(originalFullPath);
        }
      }

      acc[name] = fileContent;

      return acc;
    },
    {},
  );

  return templatesMap;
};

const getTemplateContent = (path) => {
  let fixedPath = _.endsWith(path, ".eta") ? path : `${path}.eta`;

  _.keys(config.templatePaths).forEach((key) => {
    if (_.startsWith(fixedPath, `@${key}`)) {
      fixedPath = resolve(_.replace(fixedPath, `@${key}`, config.templatePaths[key]));
    }
  });

  if (pathIsExist(fixedPath)) {
    return getFileContent(fixedPath);
  }

  const customPath = resolve(config.templatePaths.custom, fixedPath);

  if (pathIsExist(customPath)) {
    return getFileContent(customPath);
  }

  const originalPath = resolve(config.templatePaths.original, fixedPath);

  if (pathIsExist(originalPath)) {
    return getFileContent(originalPath);
  }

  return "";
};

const renderTemplate = (template, configuration, options) => {
  if (!template) return "";

  return Eta.render(template, configuration, {
    async: false,
    ...(options || {}),
    includeFile: (path, payload) => renderTemplate(getTemplateContent(path), payload),
  });
};

module.exports = {
  getTemplates,
  getTemplatePaths,
  renderTemplate,
};
