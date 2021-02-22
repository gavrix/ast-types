"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = __importDefault(require("assert"));
var flow_parser_1 = __importDefault(require("flow-parser"));
var fork_1 = __importDefault(require("../fork"));
var flow_1 = __importDefault(require("../def/flow"));
var types = fork_1.default([
    flow_1.default,
]);
describe("flow types", function () {
    it("issue #242", function () {
        var parser = {
            parse: function (code) {
                return flow_parser_1.default.parse(code, {
                    types: true
                });
            }
        };
        var program = parser.parse([
            "class A<B> extends C<D> {}",
            "function f<E>() {}",
        ].join("\n"));
        var identifierNames = [];
        var typeParamNames = [];
        types.visit(program, {
            visitIdentifier: function (path) {
                identifierNames.push(path.node.name);
                this.traverse(path);
            },
            visitTypeParameter: function (path) {
                typeParamNames.push(path.node.name);
                this.traverse(path);
            }
        });
        assert_1.default.deepEqual(identifierNames, ["A", "C", "D", "f"]);
        assert_1.default.deepEqual(typeParamNames, ["B", "E"]);
    });
    it("issue #261", function () {
        var parser = {
            parse: function (code) {
                return flow_parser_1.default.parse(code, {
                    types: true
                });
            }
        };
        var program = parser.parse('declare module.exports: {};');
        assert_1.default.strictEqual(program.body[0].type, 'DeclareModuleExports');
        assert_1.default.notEqual(program.body[0].typeAnnotation, undefined);
        assert_1.default.strictEqual(program.body[0].typeAnnotation.type, 'TypeAnnotation');
    });
    it("Explicit type arguments", function () {
        var parser = {
            parse: function (code) {
                return flow_parser_1.default.parse(code, {
                    types: true
                });
            }
        };
        var program = parser.parse([
            'test<A>();',
            'test<B, C>();',
            'new test<D>();',
            'new test<E, F>();',
        ].join("\n"));
        var typeParamNames = [];
        types.visit(program, {
            visitGenericTypeAnnotation: function (path) {
                typeParamNames.push(path.node.id.name);
                this.traverse(path);
            }
        });
        assert_1.default.deepEqual(typeParamNames, ["A", "B", "C", "D", "E", "F"]);
    });
    describe('scope', function () {
        var scope = [
            "type Foo = {}",
            "interface Bar {}"
        ];
        var ast = flow_parser_1.default.parse(scope.join("\n"));
        it("should register flow types with the scope", function () {
            types.visit(ast, {
                visitProgram: function (path) {
                    assert_1.default(path.scope.declaresType('Foo'));
                    assert_1.default(path.scope.declaresType('Bar'));
                    assert_1.default.equal(path.scope.lookupType('Foo').getTypes()['Foo'][0].parent.node.type, 'TypeAlias');
                    assert_1.default.equal(path.scope.lookupType('Bar').getTypes()['Bar'][0].parent.node.type, 'InterfaceDeclaration');
                    return false;
                }
            });
        });
    });
});
