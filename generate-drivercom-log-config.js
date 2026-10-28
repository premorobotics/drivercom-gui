import { execSync } from "child_process";
import JSON5 from "json5";
import { writeFileSync } from "fs";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const rustInfo = execSync("rustc -vV");
const match = /host: (\S+)/g.exec(rustInfo);
if (!match) {
  console.error("Failed to determine platform target triple");
  process.exitCode = 1;
  process.exit();
}

const targetTriple = match[1];
const extension = process.platform === "win32" ? ".exe" : "";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const binaryName = path.resolve(
  __dirname,
  "src-tauri",
  "binaries",
  `drivercom-${targetTriple}${extension}`,
);

try {
  const logConfigInfo = execSync(`"${binaryName}" log.config.empty`);
  const logCommandUnion = execSync(`"${binaryName}" log.config.command.list`).toString()
  const parseLogCommandUnion = logCommandUnion.trim().split(']:')[1]
  const logCommandArray = JSON5.parse(parseLogCommandUnion)
  if (typeof logCommandArray === "object" && Array.isArray(logCommandArray)) {
    const filterLogCommandArray = logCommandArray.filter((command) => typeof command !== "undefined")
    const commandUnion = generateUnion(filterLogCommandArray)
    const logConfigSchema = generateZodSchema(JSON5.parse(logConfigInfo), "", commandUnion);
    const logConfigFile = generateFileContent(logConfigSchema, "logConfig");
    writeFileSync(
      "./src-tauri/generated/config/LogConfigType.tsx",
      logConfigFile,
    );
  } else {
    console.error('Command union type not found')
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
  process.exit();
}

function generateFileContent(schema, typeName) {
  const output = `import * as z from 'zod';

${schema.sub}

export const ${prettierLabel(typeName)}Schema = ${schema.main};

export type ${prettierLabel(typeName)}Type = z.infer<typeof ${prettierLabel(typeName)}Schema>;

export const ${typeName}DefaultValues: ${prettierLabel(typeName)}Type = ${prettierLabel(typeName)}Schema.parse({});
`;
  return output;
}

function generateZodSchema(obj, parentKey, schema) {
  let mainSchemaStr = "z.object({\n";
  let subSchemaStr = "";
  const filteredObject = Object.entries(obj)
  for (const entry of filteredObject) {
    const key = entry[0];
    const value = entry[1];
    if (value === null) {
      mainSchemaStr += `  ${key}: z.any().nullable().default(null),\n`;
      continue;
    }

    if (key === "command" && typeof value === "object") {
      const innerKey = Object.keys(value)[0]
      mainSchemaStr += `${key}: ${key}Schema.default(() => ${key[0].toUpperCase() + key.slice(1, key.length)}_${innerKey[0].toUpperCase() + innerKey.slice(1, innerKey.length)}_Schema.parse({}))`
      subSchemaStr += `${schema.sub}`
      subSchemaStr += `export const ${key}Schema = ${schema.main}\n`
      subSchemaStr += `export type ${key[0].toUpperCase() + key.slice(1, key.length)}Type = z.infer<typeof ${key}Schema>\n`
      continue;
    }

    const type = typeof value;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        mainSchemaStr += `${key}: z.array(z.any()).default([]),\n`;
      } else {
        if (typeof value[0] === "object") {
          const schemaType = generateZodSchema(
            value[0],
            parentKey.length > 0
              ? parentKey + "_" + prettierLabel(key)
              : prettierLabel(key),
          );
          if (schemaType.sub.length > 0) {
            subSchemaStr += schemaType.sub;
          }

          const schemaName = `${parentKey.length > 0 ? prettierLabel(parentKey) + "_" : ""}${prettierLabel(key)}_Schema`;
          const typeName = `${parentKey.length > 0 ? prettierLabel(parentKey) : ""}${prettierLabel(key)}Type`;
          const defaultLength = value.length;
          subSchemaStr += `export const ${schemaName} = ${schemaType.main}\n`;
          subSchemaStr += `export type ${typeName} = z.infer<typeof ${schemaName}>\n\n`;
          mainSchemaStr += `  ${key}: z.array(${schemaName}).length(${defaultLength}).default(() => Array.from({length: ${defaultLength}}, () => ${schemaName}.parse({}))),\n`;
        }
      }
    } else {
      if (type === "number")
        mainSchemaStr += `  ${key}: z.number().default(${value}),\n`;
      else if (type === "boolean")
        mainSchemaStr += `  ${key}: z.boolean().default(${value}),\n`;
      else if (type === "string")
        mainSchemaStr += `  ${key}: z.string().default(${JSON.stringify(value)}),\n`;
      else if (type === "object") {
        const childSchema = generateZodSchema(
          value,
          parentKey.length > 0
            ? parentKey + "_" + prettierLabel(key)
            : prettierLabel(key),
        );
        if (childSchema.sub.length > 0) {
          subSchemaStr += childSchema.sub;
        }
        const schemaName = `${parentKey.length > 0 ? prettierLabel(parentKey) + "_" : ""}${prettierLabel(key)}_Schema`;
        const typeName = `${parentKey.length > 0 ? prettierLabel(parentKey) : ""}${prettierLabel(key)}Type`;
        subSchemaStr += `export const ${schemaName} = ${childSchema.main}\n`;
        subSchemaStr += `export type ${typeName} = z.infer<typeof ${schemaName}>\n\n`;
        mainSchemaStr += `  ${key}: ${schemaName}.default(() => ${schemaName}.parse({})),\n`;
      }
    }
  }
  mainSchemaStr += "})";
  return {
    main: mainSchemaStr,
    sub: subSchemaStr,
  };
}

function prettierLabel(str) {
  return Array.from(str)
    .map((char, i) => (i === 0 ? char.toUpperCase() : char))
    .join("");
}

function generateUnion(unionFields) {
  let subSchemaStr = ""
  let mainSchemaStr = 'z.union(['
  unionFields.forEach((union) => {
    const shema = generateZodSchema(union, "")
    const unionKey = Object.keys(union)[0]
    const pretterLabel = unionKey[0].toUpperCase() + unionKey.slice(1, unionKey.length)
    const childSchemaLabel = `${pretterLabel}_Schema`
    const parentSchemaLabel = `Command_${childSchemaLabel}`
    const parentSchema = `export const ${parentSchemaLabel} = z.object({${unionKey}: ${childSchemaLabel}.default(() => ${childSchemaLabel}.parse({}))})\n`
    const parentType = `export type Command${pretterLabel}Type = z.infer<typeof ${parentSchemaLabel}>\n`
    subSchemaStr = subSchemaStr + shema.sub + parentSchema + parentType
    mainSchemaStr = mainSchemaStr + `Command_${childSchemaLabel},`
  })
  mainSchemaStr = mainSchemaStr + '])'
  return {
    main: mainSchemaStr,
    sub: subSchemaStr
  }
}
