import * as typescriptParser from '@typescript-eslint/parser';
import * as vueEslintParser from 'vue-eslint-parser';
import stylisticEslint from '@stylistic/eslint-plugin';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        files: ['src/**/*.ts', 'src/**/*.js', 'src/**/*.vue'],
        plugins: {
            '@stylistic': stylisticEslint,
        },
        languageOptions: {
            parser: vueEslintParser,
            parserOptions: {
                tsconfigRootDir: __dirname,
                projectService: true,
                parser: typescriptParser,
                extraFileExtensions: ['.vue'],
            },
        },
        rules: {
            // 尾随分号
            '@stylistic/semi': ['error', 'always'],
            // 分号之前或之后放置不必要的空格
            '@stylistic/semi-spacing': ['error', { before: false, after: true }],
            // 分号位于行的位置
            '@stylistic/semi-style': ['error', 'last'],
            // 是否允许使用不必要的分号
            '@stylistic/no-extra-semi': ['error'],

            // 引号
            '@stylistic/quotes': ['warn', 'single'],
            // 定义对象文本属性名称引号
            '@stylistic/quote-props': ['error', 'as-needed'],

            // 尾随逗号
            '@stylistic/comma-dangle': ['error', 'only-multiline'],
            // 逗号前后的空格
            '@stylistic/comma-spacing': ['error', { before: false, after: true }],
            // 逗号位于行的位置
            '@stylistic/comma-style': ['error', 'last'],

            // 箭头函数的箭头 （ => ） 之前/之后的间距空格
            '@stylistic/arrow-spacing': ['error'],
            // 块间距空格
            '@stylistic/block-spacing': ['error'],
            // 计算属性前后空格
            '@stylistic/computed-property-spacing': ['error', 'never'],
            // 函数名称和调用它的左括号之间是否有空格
            '@stylistic/function-call-spacing': ['error', 'never'],
            // 键值对冒号前后空格
            '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
            // 关键词前后空格
            '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
            // 大括号内是否允许不必要的空格
            '@stylistic/object-curly-spacing': ['error', 'always'],
            // 拓展运算符与变量名称之间空格
            '@stylistic/rest-spread-spacing': ['error', 'never'],
            // 冒号周围的空格提高了 / default 子句的 case 可读性
            '@stylistic/switch-colon-spacing': ['error'],
            // 模板字符串内空格
            '@stylistic/template-curly-spacing': ['error'],
            // 模板字符串与普通字符串之间空格
            '@stylistic/template-tag-spacing': ['error'],
            // 函数名称或 function 关键字与开头的面板之间是否允许有空格
            '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
            // 块前空格
            '@stylistic/space-before-blocks': ['error'],
            // 不允许使用混合空格和制表符进行缩进
            '@stylistic/no-mixed-spaces-and-tabs': ['error'],
            // 不允许一行中不用于缩进的多个空格
            '@stylistic/no-multi-spaces': ['error', { exceptions: { Property: false } }],
            // 不允许在行尾使用尾随空格（空格、制表符和其他 Unicode 空格字符）
            '@stylistic/no-trailing-spaces': ['error'],
            // 如果对象属性位于同一行，则此规则不允许在点周围或左括号之前使用空格
            '@stylistic/no-whitespace-before-property': ['error'],
            // 不允许在括号内使用空格
            '@stylistic/space-in-parens': ['error', 'never'],
            // 中缀运算符周围有空格
            '@stylistic/space-infix-ops': ['error'],
            // 一元运算符后 words 和一元运算符后/前 non words 空格
            '@stylistic/space-unary-ops': ['error'],
            // 首字母 // 或 /* 注释之后立即使用空格
            '@stylistic/spaced-comment': ['error', 'always'],

            // 首选 const
            'prefer-const': ['error'],
            // 赋值运算符 += -=
            'operator-assignment': ['error', 'always'],
            // 函数最多参数个数
            'max-params': ['warn', 3],
            // 缩进风格
            '@stylistic/indent': ['error', 4],
            // 不建议使用 any
            '@typescript-eslint/no-explicit-any': ['warn'],
            // 不建议定义空对象接口
            '@typescript-eslint/no-empty-object-type': ['warn'],
            // 不建议使用 Function 类型
            '@typescript-eslint/no-unsafe-function-type': ['warn'],
            // ignoreRestSiblings: true：当你解构时丢掉某个字段但又把剩余的展开成 ...rest，别再对那个被丢掉的字段报“未使用”错误。
            '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
            // 每个函数的最大行数
            'max-lines-per-function': ['warn', 200],
            // 每个文件的最大行数
            'max-lines': ['warn', { max: 700, skipBlankLines: true, skipComments: true }],

            // 组件名称为多个单词，防止与现有和将来的 HTML 元素发生冲突，因为所有 HTML 元素都是单个单词
            'vue/multi-word-component-names': ['warn'],
            // 控制 vue 文件中 html 的缩进
            'vue/html-indent': ['warn', 4],
        },
    },
];
