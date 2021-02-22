"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var recast_1 = require("recast");
var main_1 = require("../main");
var Op = Object.prototype;
var hasOwn = Op.hasOwnProperty;
var RESERVED_WORDS = {
    extends: true,
    default: true,
    arguments: true,
    static: true,
};
var NAMED_TYPES_ID = main_1.builders.identifier("namedTypes");
var NAMED_TYPES_IMPORT = main_1.builders.importDeclaration([main_1.builders.importSpecifier(NAMED_TYPES_ID)], main_1.builders.stringLiteral("./namedTypes"));
var KINDS_ID = main_1.builders.identifier("K");
var KINDS_IMPORT = main_1.builders.importDeclaration([main_1.builders.importNamespaceSpecifier(KINDS_ID)], main_1.builders.stringLiteral("./kinds"));
var supertypeToSubtypes = getSupertypeToSubtypes();
var builderTypeNames = getBuilderTypeNames();
var out = [
    {
        file: "kinds.ts",
        ast: moduleWithBody([
            NAMED_TYPES_IMPORT
        ].concat(Object.keys(supertypeToSubtypes).map(function (supertype) {
            var buildableSubtypes = getBuildableSubtypes(supertype);
            if (buildableSubtypes.length === 0) {
                // Some of the XML* types don't have buildable subtypes,
                // so fall back to using the supertype's node type
                return main_1.builders.exportNamedDeclaration(main_1.builders.tsTypeAliasDeclaration(main_1.builders.identifier(supertype + "Kind"), main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(NAMED_TYPES_ID, main_1.builders.identifier(supertype)))));
            }
            return main_1.builders.exportNamedDeclaration(main_1.builders.tsTypeAliasDeclaration(main_1.builders.identifier(supertype + "Kind"), main_1.builders.tsUnionType(buildableSubtypes.map(function (subtype) {
                return main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(NAMED_TYPES_ID, main_1.builders.identifier(subtype)));
            }))));
        }))),
    },
    {
        file: "namedTypes.ts",
        ast: moduleWithBody([
            main_1.builders.importDeclaration([main_1.builders.importSpecifier(main_1.builders.identifier("Omit"))], main_1.builders.stringLiteral("../types")),
            main_1.builders.importDeclaration([main_1.builders.importSpecifier(main_1.builders.identifier("Type"))], main_1.builders.stringLiteral("../lib/types")),
            KINDS_IMPORT,
            main_1.builders.exportNamedDeclaration(main_1.builders.tsModuleDeclaration(main_1.builders.identifier("namedTypes"), main_1.builders.tsModuleBlock(Object.keys(main_1.namedTypes).map(function (typeName) {
                var typeDef = main_1.Type.def(typeName);
                var ownFieldNames = Object.keys(typeDef.ownFields);
                return main_1.builders.exportNamedDeclaration(main_1.builders.tsInterfaceDeclaration.from({
                    id: main_1.builders.identifier(typeName),
                    extends: typeDef.baseNames.map(function (baseName) {
                        var baseDef = main_1.Type.def(baseName);
                        var commonFieldNames = ownFieldNames
                            .filter(function (fieldName) { return !!baseDef.allFields[fieldName]; });
                        if (commonFieldNames.length > 0) {
                            return main_1.builders.tsExpressionWithTypeArguments(main_1.builders.identifier("Omit"), main_1.builders.tsTypeParameterInstantiation([
                                main_1.builders.tsTypeReference(main_1.builders.identifier(baseName)),
                                main_1.builders.tsUnionType(commonFieldNames.map(function (fieldName) {
                                    return main_1.builders.tsLiteralType(main_1.builders.stringLiteral(fieldName));
                                })),
                            ]));
                        }
                        else {
                            return main_1.builders.tsExpressionWithTypeArguments(main_1.builders.identifier(baseName));
                        }
                    }),
                    body: main_1.builders.tsInterfaceBody(ownFieldNames.map(function (fieldName) {
                        var field = typeDef.allFields[fieldName];
                        if (field.name === "type" && field.defaultFn) {
                            return main_1.builders.tsPropertySignature(main_1.builders.identifier("type"), main_1.builders.tsTypeAnnotation(main_1.builders.tsLiteralType(main_1.builders.stringLiteral(field.defaultFn()))));
                        }
                        else if (field.defaultFn) {
                            return main_1.builders.tsPropertySignature(main_1.builders.identifier(field.name), main_1.builders.tsTypeAnnotation(getTSTypeAnnotation(field.type)), true);
                        }
                        return main_1.builders.tsPropertySignature(main_1.builders.identifier(field.name), main_1.builders.tsTypeAnnotation(getTSTypeAnnotation(field.type)));
                    })),
                }));
            }).concat([
                main_1.builders.exportNamedDeclaration(main_1.builders.tsTypeAliasDeclaration(main_1.builders.identifier("ASTNode"), main_1.builders.tsUnionType(Object.keys(main_1.namedTypes)
                    .filter(function (typeName) { return main_1.Type.def(typeName).buildable; })
                    .map(function (typeName) { return main_1.builders.tsTypeReference(main_1.builders.identifier(typeName)); }))))
            ], Object.keys(main_1.namedTypes).map(function (typeName) {
                return main_1.builders.exportNamedDeclaration(main_1.builders.variableDeclaration("let", [
                    main_1.builders.variableDeclarator(main_1.builders.identifier.from({
                        name: typeName,
                        typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeReference(main_1.builders.identifier("Type"), main_1.builders.tsTypeParameterInstantiation([
                            main_1.builders.tsTypeReference(main_1.builders.identifier(typeName)),
                        ]))),
                    })),
                ]));
            }))))),
            main_1.builders.exportNamedDeclaration(main_1.builders.tsInterfaceDeclaration(main_1.builders.identifier("NamedTypes"), main_1.builders.tsInterfaceBody(Object.keys(main_1.namedTypes).map(function (typeName) {
                return main_1.builders.tsPropertySignature(main_1.builders.identifier(typeName), main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeReference(main_1.builders.identifier("Type"), main_1.builders.tsTypeParameterInstantiation([
                    main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(main_1.builders.identifier("namedTypes"), main_1.builders.identifier(typeName))),
                ]))));
            })))),
        ]),
    },
    {
        file: "builders.ts",
        ast: moduleWithBody([
            KINDS_IMPORT,
            NAMED_TYPES_IMPORT
        ].concat(builderTypeNames.map(function (typeName) {
            var typeDef = main_1.Type.def(typeName);
            var returnType = main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(NAMED_TYPES_ID, main_1.builders.identifier(typeName))));
            var buildParamAllowsUndefined = {};
            var buildParamIsOptional = {};
            typeDef.buildParams.slice().reverse().forEach(function (cur, i, arr) {
                var field = typeDef.allFields[cur];
                if (field && field.defaultFn) {
                    if (i === 0) {
                        buildParamIsOptional[cur] = true;
                    }
                    else {
                        if (buildParamIsOptional[arr[i - 1]]) {
                            buildParamIsOptional[cur] = true;
                        }
                        else {
                            buildParamAllowsUndefined[cur] = true;
                        }
                    }
                }
            });
            return main_1.builders.exportNamedDeclaration(main_1.builders.tsInterfaceDeclaration(main_1.builders.identifier(typeName + "Builder"), main_1.builders.tsInterfaceBody([
                main_1.builders.tsCallSignatureDeclaration(typeDef.buildParams
                    .filter(function (buildParam) { return !!typeDef.allFields[buildParam]; })
                    .map(function (buildParam) {
                    var field = typeDef.allFields[buildParam];
                    var name = RESERVED_WORDS[buildParam] ? buildParam + "Param" : buildParam;
                    return main_1.builders.identifier.from({
                        name: name,
                        typeAnnotation: main_1.builders.tsTypeAnnotation(!!buildParamAllowsUndefined[buildParam]
                            ? main_1.builders.tsUnionType([getTSTypeAnnotation(field.type), main_1.builders.tsUndefinedKeyword()])
                            : getTSTypeAnnotation(field.type)),
                        optional: !!buildParamIsOptional[buildParam],
                    });
                }), returnType),
                main_1.builders.tsMethodSignature(main_1.builders.identifier("from"), [
                    main_1.builders.identifier.from({
                        name: "params",
                        typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeLiteral(Object.keys(typeDef.allFields)
                            .filter(function (fieldName) { return fieldName !== "type"; })
                            .sort() // Sort field name strings lexicographically.
                            .map(function (fieldName) {
                            var field = typeDef.allFields[fieldName];
                            return main_1.builders.tsPropertySignature(main_1.builders.identifier(field.name), main_1.builders.tsTypeAnnotation(getTSTypeAnnotation(field.type)), field.defaultFn != null || field.hidden);
                        }))),
                    }),
                ], returnType),
            ])));
        }), [
            main_1.builders.exportNamedDeclaration(main_1.builders.tsInterfaceDeclaration(main_1.builders.identifier("builders"), main_1.builders.tsInterfaceBody(builderTypeNames.map(function (typeName) {
                return main_1.builders.tsPropertySignature(main_1.builders.identifier(main_1.getBuilderName(typeName)), main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeReference(main_1.builders.identifier(typeName + "Builder"))));
            }).concat([
                main_1.builders.tsIndexSignature([
                    main_1.builders.identifier.from({
                        name: "builderName",
                        typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsStringKeyword()),
                    }),
                ], main_1.builders.tsTypeAnnotation(main_1.builders.tsAnyKeyword())),
            ])))),
        ])),
    },
    {
        file: "visitor.ts",
        ast: moduleWithBody([
            main_1.builders.importDeclaration([main_1.builders.importSpecifier(main_1.builders.identifier("NodePath"))], main_1.builders.stringLiteral("../lib/node-path")),
            main_1.builders.importDeclaration([main_1.builders.importSpecifier(main_1.builders.identifier("Context"))], main_1.builders.stringLiteral("../lib/path-visitor")),
            NAMED_TYPES_IMPORT,
            main_1.builders.exportNamedDeclaration(main_1.builders.tsInterfaceDeclaration.from({
                id: main_1.builders.identifier("Visitor"),
                typeParameters: main_1.builders.tsTypeParameterDeclaration([
                    main_1.builders.tsTypeParameter("M", undefined, main_1.builders.tsTypeLiteral([])),
                ]),
                body: main_1.builders.tsInterfaceBody(Object.keys(main_1.namedTypes).map(function (typeName) {
                    return main_1.builders.tsMethodSignature.from({
                        key: main_1.builders.identifier("visit" + typeName),
                        parameters: [
                            main_1.builders.identifier.from({
                                name: "this",
                                typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsIntersectionType([
                                    main_1.builders.tsTypeReference(main_1.builders.identifier("Context")),
                                    main_1.builders.tsTypeReference(main_1.builders.identifier("M")),
                                ])),
                            }),
                            main_1.builders.identifier.from({
                                name: "path",
                                typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsTypeReference(main_1.builders.identifier("NodePath"), main_1.builders.tsTypeParameterInstantiation([
                                    main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(NAMED_TYPES_ID, main_1.builders.identifier(typeName))),
                                ]))),
                            }),
                        ],
                        optional: true,
                        typeAnnotation: main_1.builders.tsTypeAnnotation(main_1.builders.tsAnyKeyword()),
                    });
                }).slice()),
            })),
        ]),
    },
];
out.forEach(function (_a) {
    var file = _a.file, ast = _a.ast;
    fs_1.default.writeFileSync(path_1.default.resolve(__dirname, "../gen/" + file), recast_1.prettyPrint(ast, { tabWidth: 2, includeComments: true }).code);
});
function moduleWithBody(body) {
    return main_1.builders.file.from({
        comments: [main_1.builders.commentBlock(" !!! THIS FILE WAS AUTO-GENERATED BY `npm run gen` !!! ")],
        program: main_1.builders.program(body),
    });
}
function getSupertypeToSubtypes() {
    var supertypeToSubtypes = {};
    Object.keys(main_1.namedTypes).map(function (typeName) {
        main_1.Type.def(typeName).supertypeList.forEach(function (supertypeName) {
            supertypeToSubtypes[supertypeName] = supertypeToSubtypes[supertypeName] || [];
            supertypeToSubtypes[supertypeName].push(typeName);
        });
    });
    return supertypeToSubtypes;
}
function getBuilderTypeNames() {
    return Object.keys(main_1.namedTypes).filter(function (typeName) {
        var typeDef = main_1.Type.def(typeName);
        var builderName = main_1.getBuilderName(typeName);
        return !!typeDef.buildParams && !!main_1.builders[builderName];
    });
}
function getBuildableSubtypes(supertype) {
    return Array.from(new Set(Object.keys(main_1.namedTypes).filter(function (typeName) {
        var typeDef = main_1.Type.def(typeName);
        return typeDef.allSupertypes[supertype] != null && typeDef.buildable;
    })));
}
function getTSTypeAnnotation(type) {
    switch (type.kind) {
        case "ArrayType": {
            var elemTypeAnnotation = getTSTypeAnnotation(type.elemType);
            // TODO Improve this test.
            return main_1.namedTypes.TSUnionType.check(elemTypeAnnotation)
                ? main_1.builders.tsArrayType(main_1.builders.tsParenthesizedType(elemTypeAnnotation))
                : main_1.builders.tsArrayType(elemTypeAnnotation);
        }
        case "IdentityType": {
            if (type.value === null) {
                return main_1.builders.tsNullKeyword();
            }
            switch (typeof type.value) {
                case "undefined":
                    return main_1.builders.tsUndefinedKeyword();
                case "string":
                    return main_1.builders.tsLiteralType(main_1.builders.stringLiteral(type.value));
                case "boolean":
                    return main_1.builders.tsLiteralType(main_1.builders.booleanLiteral(type.value));
                case "number":
                    return main_1.builders.tsNumberKeyword();
                case "object":
                    return main_1.builders.tsObjectKeyword();
                case "function":
                    return main_1.builders.tsFunctionType([]);
                case "symbol":
                    return main_1.builders.tsSymbolKeyword();
                default:
                    return main_1.builders.tsAnyKeyword();
            }
        }
        case "ObjectType": {
            return main_1.builders.tsTypeLiteral(type.fields.map(function (field) {
                return main_1.builders.tsPropertySignature(main_1.builders.identifier(field.name), main_1.builders.tsTypeAnnotation(getTSTypeAnnotation(field.type)));
            }));
        }
        case "OrType": {
            return main_1.builders.tsUnionType(type.types.map(function (type) { return getTSTypeAnnotation(type); }));
        }
        case "PredicateType": {
            if (typeof type.name !== "string") {
                return main_1.builders.tsAnyKeyword();
            }
            if (hasOwn.call(main_1.namedTypes, type.name)) {
                return main_1.builders.tsTypeReference(main_1.builders.tsQualifiedName(KINDS_ID, main_1.builders.identifier(type.name + "Kind")));
            }
            if (/^[$A-Z_][a-z0-9_$]*$/i.test(type.name)) {
                return main_1.builders.tsTypeReference(main_1.builders.identifier(type.name));
            }
            if (/^number [<>=]+ \d+$/.test(type.name)) {
                return main_1.builders.tsNumberKeyword();
            }
            // Not much else to do...
            return main_1.builders.tsAnyKeyword();
        }
        default:
            return assertNever(type);
    }
}
function assertNever(x) {
    throw new Error("Unexpected: " + x);
}
