"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = __importDefault(require("assert"));
var esprima_1 = require("esprima");
var espree = __importStar(require("espree"));
var esprimaFb = __importStar(require("esprima-fb"));
var babelTypes = __importStar(require("@babel/types"));
var fork_1 = __importDefault(require("../fork"));
var main_1 = require("../main");
var shared_1 = require("./shared");
var types_1 = __importDefault(require("../lib/types"));
var esprima_2 = __importDefault(require("../def/esprima"));
var core_1 = __importDefault(require("../def/core"));
var es6_1 = __importDefault(require("../def/es6"));
var es7_1 = __importDefault(require("../def/es7"));
var babel_1 = __importDefault(require("../def/babel"));
var isRegExp = main_1.builtInTypes.RegExp, isString = main_1.builtInTypes.string;
var rawTypes = main_1.use(types_1.default);
var hasOwn = Object.prototype.hasOwnProperty;
var nodeMajorVersion = parseInt(process.versions.node, 10);
describe("basic type checking", function () {
    var fooId = main_1.builders.identifier("foo");
    var ifFoo = main_1.builders.ifStatement(fooId, main_1.builders.blockStatement([
        main_1.builders.expressionStatement(main_1.builders.callExpression(fooId, []))
    ]));
    it("should exhibit sanity", function () {
        assert_1.default.ok(main_1.namedTypes.IfStatement.check(ifFoo));
        assert_1.default.ok(main_1.namedTypes.Statement.check(ifFoo));
        assert_1.default.ok(main_1.namedTypes.Node.check(ifFoo));
        assert_1.default.ok(main_1.namedTypes.BlockStatement.check(ifFoo.consequent));
        if (main_1.namedTypes.BlockStatement.check(ifFoo.consequent)) {
            var statement = ifFoo.consequent.body[0];
            assert_1.default.ok(main_1.namedTypes.ExpressionStatement.check(statement));
            if (main_1.namedTypes.ExpressionStatement.check(statement)) {
                var callExpression = statement.expression;
                assert_1.default.ok(main_1.namedTypes.CallExpression.check(callExpression));
                if (main_1.namedTypes.CallExpression.check(callExpression)) {
                    assert_1.default.strictEqual(callExpression.arguments.length, 0);
                }
            }
        }
        assert_1.default.strictEqual(ifFoo.test, fooId);
        assert_1.default.ok(main_1.namedTypes.Expression.check(ifFoo.test));
        assert_1.default.ok(main_1.namedTypes.Identifier.check(ifFoo.test));
        assert_1.default.ok(!main_1.namedTypes.Statement.check(ifFoo.test));
        assert_1.default.equal(main_1.builders.importDeclaration([main_1.builders.importDefaultSpecifier(main_1.builders.identifier("foo"))], main_1.builders.literal("bar")).importKind, "value");
        assert_1.default.throws(function () {
            main_1.builders.importDeclaration([main_1.builders.importDefaultSpecifier(main_1.builders.identifier("foo"))], main_1.builders.literal("bar"), "baz");
        });
        assert_1.default.ok(main_1.namedTypes.ImportDeclaration.check(main_1.builders.importDeclaration([main_1.builders.importDefaultSpecifier(main_1.builders.identifier("foo"))], main_1.builders.literal("bar"), "type")));
        assert_1.default.ok(main_1.namedTypes.ImportDeclaration.check(main_1.builders.importDeclaration([main_1.builders.importNamespaceSpecifier(main_1.builders.identifier("foo"))], main_1.builders.literal("bar"))));
    });
});
describe("builders", function () {
    it("should build types using positional arguments", function () {
        var fooId = main_1.builders.identifier("foo");
        var consequent = main_1.builders.blockStatement([
            main_1.builders.expressionStatement(main_1.builders.callExpression(fooId, []))
        ]);
        var ifFoo = main_1.builders.ifStatement(fooId, consequent);
        assert_1.default.ok(main_1.namedTypes.Identifier.check(fooId));
        assert_1.default.ok(main_1.namedTypes.IfStatement.check(ifFoo));
        assert_1.default.ok(main_1.namedTypes.Statement.check(ifFoo));
        assert_1.default.strictEqual(fooId.name, "foo");
        assert_1.default.strictEqual(fooId.optional, false);
        assert_1.default.strictEqual(ifFoo.test, fooId);
        assert_1.default.strictEqual(ifFoo.consequent, consequent);
        assert_1.default.strictEqual(ifFoo.alternate, null);
    });
    it("should build types using `.from`", function () {
        var fooId = main_1.builders.identifier.from({
            name: "foo",
            optional: true
        });
        var consequent = main_1.builders.blockStatement.from({
            body: [
                main_1.builders.expressionStatement.from({
                    expression: main_1.builders.callExpression.from({ callee: fooId, arguments: [] })
                })
            ]
        });
        var ifFoo = main_1.builders.ifStatement.from({
            test: fooId,
            consequent: consequent
        });
        assert_1.default.ok(main_1.namedTypes.Identifier.check(fooId));
        assert_1.default.ok(main_1.namedTypes.IfStatement.check(ifFoo));
        assert_1.default.ok(main_1.namedTypes.Statement.check(ifFoo));
        assert_1.default.strictEqual(fooId.name, "foo");
        assert_1.default.strictEqual(fooId.optional, true);
        assert_1.default.strictEqual(ifFoo.test, fooId);
        assert_1.default.strictEqual(ifFoo.consequent, consequent);
        assert_1.default.strictEqual(ifFoo.alternate, null);
    });
});
describe("isSupertypeOf", function () {
    it("should report correct supertype relationships", function () {
        var def = main_1.Type.def;
        assert_1.default.ok(def("Node").isSupertypeOf(def("Node")));
        assert_1.default.ok(def("Node").isSupertypeOf(def("Expression")));
        assert_1.default.ok(!def("Expression").isSupertypeOf(def("Node")));
        assert_1.default.ok(!def("Expression").isSupertypeOf(def("DebuggerStatement")));
        // TODO Make this test case more exhaustive.
    });
});
describe("supertype lookup", function () {
    it("should resolve the most precise supertypes", function () {
        var table = main_1.use(types_1.default).computeSupertypeLookupTable({
            Function: true,
            Declaration: true,
            ArrowFunctionExpression: true,
            Expression: true,
            Identifier: true
        });
        function check(subtype, expectedSupertype) {
            assert_1.default.strictEqual(table[subtype], expectedSupertype);
        }
        check("FunctionExpression", "Function");
        check("FunctionDeclaration", "Function");
        check("VariableDeclaration", "Declaration");
        check("Identifier", "Identifier");
        check("ArrowFunctionExpression", "ArrowFunctionExpression");
        check("ForInStatement");
        check("Node");
        check("ThisExpression", "Expression");
        check("Property");
    });
    it("should properly linearize the inheritance hierarchy", function () {
        assert_1.default.deepEqual(main_1.getSupertypeNames("FunctionExpression"), ["Function", "Expression", "Node", "Printable"]);
    });
    it("should trigger an AssertionError for unknown types", function () {
        assert_1.default.throws(function () {
            main_1.getSupertypeNames("AlienBoomerangDeclaration");
        });
    });
});
describe("shallow and deep checks", function () {
    var index = main_1.builders.identifier("foo");
    var decl = main_1.builders.variableDeclaration("var", [
        main_1.builders.variableDeclarator(index, main_1.builders.literal(42))
    ]);
    it("should work when shallow", function () {
        assert_1.default.ok(main_1.namedTypes.Node.check(decl));
        assert_1.default.ok(main_1.namedTypes.Statement.check(decl));
        assert_1.default.ok(main_1.namedTypes.Declaration.check(decl));
        assert_1.default.ok(main_1.namedTypes.VariableDeclaration.check(decl));
    });
    it("should work when deep", function () {
        assert_1.default.ok(main_1.namedTypes.Node.check(decl, true));
        assert_1.default.ok(main_1.namedTypes.Statement.check(decl, true));
        assert_1.default.ok(main_1.namedTypes.Declaration.check(decl, true));
        assert_1.default.ok(main_1.namedTypes.VariableDeclaration.check(decl, true));
    });
    it("should fail when expected", function () {
        // Not an Expression.
        assert_1.default.ok(!main_1.namedTypes.Expression.check(decl));
        // This makes decl cease to conform to n.VariableDeclaration.
        decl.declarations.push(main_1.builders.literal("bar"));
        assert_1.default.ok(main_1.namedTypes.Node.check(decl));
        assert_1.default.ok(main_1.namedTypes.Statement.check(decl));
        assert_1.default.ok(main_1.namedTypes.Declaration.check(decl));
        assert_1.default.ok(main_1.namedTypes.VariableDeclaration.check(decl));
        assert_1.default.ok(!main_1.namedTypes.Node.check(decl, true));
        assert_1.default.ok(!main_1.namedTypes.Statement.check(decl, true));
        assert_1.default.ok(!main_1.namedTypes.Declaration.check(decl, true));
        // As foretold above.
        assert_1.default.ok(!main_1.namedTypes.VariableDeclaration.check(decl, true));
        // Still not an Expression.
        assert_1.default.ok(!main_1.namedTypes.Expression.check(decl));
    });
    var fs = main_1.builders.forStatement(decl, main_1.builders.binaryExpression("<", index, main_1.builders.literal(48)), main_1.builders.updateExpression("++", index, true), main_1.builders.blockStatement([
        main_1.builders.expressionStatement(main_1.builders.callExpression(index, []))
    ]));
    it("should disagree according to depth", function () {
        assert_1.default.ok(main_1.namedTypes.Node.check(fs));
        assert_1.default.ok(main_1.namedTypes.Statement.check(fs));
        assert_1.default.ok(main_1.namedTypes.ForStatement.check(fs));
        // Not a true ForStatement because fs.init is not a true
        // VariableDeclaration.
        assert_1.default.ok(!main_1.namedTypes.Node.check(fs, true));
        assert_1.default.ok(!main_1.namedTypes.Statement.check(fs, true));
        assert_1.default.ok(!main_1.namedTypes.ForStatement.check(fs, true));
    });
});
describe("whole-program validation", function () {
    this.timeout(20000);
    shared_1.validateECMAScript("test/data/backbone.js");
    shared_1.validateECMAScript("test/data/jquery-1.9.1.js");
});
describe("esprima Syntax types", function () {
    var def = main_1.Type.def, hasDef = main_1.Type.hasDef;
    var typeNames = {};
    function addTypeName(name) {
        if (shared_1.isEarlyStageProposalType(name)) {
            return;
        }
        typeNames[name] = name;
    }
    Object.keys(esprima_1.Syntax).forEach(addTypeName);
    Object.keys(esprimaFb.Syntax).forEach(addTypeName);
    Object.keys(babelTypes.VISITOR_KEYS).forEach(addTypeName);
    it("should all be buildable", function () {
        Object.keys(typeNames).forEach(function (name) {
            assert_1.default.ok(hasOwn.call(main_1.namedTypes, name), name);
            assert_1.default.strictEqual(hasDef(name) && def(name).buildable, true, name);
        });
    });
    it("builders for subtypes of Expression should have equivalent ExpressionStatement builders", function () {
        Object.keys(typeNames).forEach(function (name) {
            if (hasDef(name) && def(name).buildable &&
                def("Expression").isSupertypeOf(def(name))) {
                var statementBuilderName = rawTypes.getStatementBuilderName(name);
                assert_1.default.ok(main_1.builders[statementBuilderName], name + ":" + statementBuilderName);
            }
        });
        // sanity check
        var expStmt = main_1.builders.assignmentStatement("=", main_1.builders.identifier("a"), main_1.builders.identifier("b"));
        assert_1.default.strictEqual(expStmt.type, "ExpressionStatement");
    });
});
describe("types.getFieldValue", function () {
    it("should work for explicit fields", function () {
        assert_1.default.strictEqual(main_1.getFieldValue({
            type: "CatchClause"
        }, "type"), "CatchClause");
        assert_1.default.strictEqual(main_1.getFieldValue({
            type: "CatchClause",
            guard: main_1.builders.identifier("test")
        }, "guard").name, "test");
    });
    it("should work for implicit/default fields", function () {
        assert_1.default.strictEqual(main_1.getFieldValue({
            type: "CatchClause"
        }, "guard"), null);
        assert_1.default.strictEqual(main_1.getFieldValue({
            type: "CatchClause"
        }, "asdf"), void 0);
        assert_1.default.deepEqual(main_1.getFieldValue({
            type: "TryStatement",
        }, "handler"), null);
        assert_1.default.deepEqual(main_1.getFieldValue({
            type: "TryStatement",
        }, "handlers"), []);
        assert_1.default.deepEqual(main_1.getFieldValue({
            type: "TryStatement",
        }, "guardedHandlers"), []);
    });
    it("should work for explicitly undefined fields", function () {
        assert_1.default.deepEqual(main_1.getFieldValue({
            type: "TryStatement",
            guardedHandlers: void 0
        }, "guardedHandlers"), []);
    });
    it("should handle undefined objects", function () {
        assert_1.default.equal(main_1.getFieldValue(undefined, "name"), undefined);
    });
});
describe("types.eachField", function () {
    var context = {};
    function check(node, names) {
        var seen = [];
        main_1.eachField(node, function (name, value) {
            assert_1.default.strictEqual(this, context);
            if (name === "type")
                assert_1.default.strictEqual(node.type, value);
            seen.push(name);
        }, context);
        assert_1.default.deepEqual(seen.sort(), names.sort());
    }
    it("should give correct keys for supertypes", function () {
        check({ type: "Expression" }, ["type"]);
    });
    it("should work for non-buildable types", function () {
        check({ type: "Position" }, [
            "line", "column"
        ]);
        check({ type: "SourceLocation" }, [
            "start", "end", "source"
        ]);
    });
    it("should respect hidden fields", function () {
        check({ type: "TryStatement" }, [
            // Note that the "handlers" field is now hidden from eachField.
            "type", "block", "handler", "guardedHandlers", "finalizer"
        ]);
    });
    check({ type: "CatchClause" }, [
        "type", "param", "guard", "body"
    ]);
    it("should complain about invalid types", function () {
        try {
            check({ type: "asdf" }, ["type"]);
            throw new Error("should have thrown");
        }
        catch (e) {
            assert_1.default.strictEqual(e.message, 'did not recognize object of type "asdf"');
        }
    });
    it("should infer SourceLocation types", function () {
        check({
            line: 10,
            column: 37
        }, ["line", "column"]);
    });
});
describe("types.visit", function () {
    var call = main_1.builders.expressionStatement(main_1.builders.callExpression(main_1.builders.memberExpression(main_1.builders.identifier("foo"), main_1.builders.identifier("bar"), false), [main_1.builders.literal("baz")]));
    var ts = main_1.builders.tryStatement(main_1.builders.blockStatement([call, call]), main_1.builders.catchClause(main_1.builders.identifier("err"), null, main_1.builders.blockStatement([])));
    it("should have correct .parent path", function () {
        var literalCount = 0;
        main_1.namedTypes.TryStatement.assert(main_1.visit(ts, {
            visitLiteral: function (path) {
                var node = path.node;
                literalCount += 1;
                assert_1.default.strictEqual(node.value, "baz");
                assert_1.default.strictEqual(path.parent.node, call.expression);
                assert_1.default.strictEqual(path.parent.parent.node, call);
                assert_1.default.strictEqual(path.parent.parent.parent.node, ts.block);
                assert_1.default.strictEqual(path.parent.parent.parent.parent.node, ts);
                assert_1.default.strictEqual(path.parent.parent.parent.parent.parent, null);
                this.traverse(path);
            }
        }), true);
        assert_1.default.strictEqual(literalCount, 2);
    });
    it("should abort subtree traversal when false returned", function () {
        var ids = {};
        main_1.visit(ts, {
            visitMemberExpression: function (_path) {
                return false;
            },
            visitIdentifier: function (path) {
                ids[path.node.name] = true;
                this.traverse(path);
            }
        });
        // Make sure all identifers beneath member expressions were skipped.
        assert_1.default.deepEqual(ids, { err: true });
        ids = {};
        main_1.visit(ts, {
            visitIdentifier: function (path) {
                ids[path.node.name] = true;
                this.traverse(path);
            }
        });
        // Now make sure those identifiers (foo and bar) were visited.
        assert_1.default.deepEqual(ids, {
            err: true,
            foo: true,
            bar: true
        });
    });
    it("this.abort() should abort entire traversal", function () {
        var literal = "not visited";
        var unvisitedTypes = [];
        var root = main_1.visit(call, {
            visitIdentifier: function (path) {
                if (path.value.name === "foo") {
                    this.abort();
                }
            },
            visitLiteral: function (path) {
                literal = path.value;
                this.traverse(path);
            },
            visitNode: function (path) {
                unvisitedTypes.push(path.value.type);
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(root, call);
        assert_1.default.strictEqual(literal, "not visited");
        assert_1.default.deepEqual(unvisitedTypes, [
            "ExpressionStatement",
            "CallExpression",
            "MemberExpression"
        ]);
    });
    it("this.abort() should be cancelable", function () {
        var literal = "not visited";
        var unvisitedTypes = [];
        var root = main_1.visit(call, {
            visitIdentifier: function (path) {
                if (path.value.name === "foo") {
                    this.abort();
                }
            },
            visitMemberExpression: function (path) {
                try {
                    this.traverse(path);
                }
                catch (err) {
                    assert_1.default.ok(err instanceof this.AbortRequest);
                    err.cancel();
                }
            },
            visitLiteral: function (path) {
                literal = path.value;
                this.traverse(path);
            },
            visitNode: function (path) {
                unvisitedTypes.push(path.value.type);
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(root, call);
        main_1.namedTypes.Literal.assert(literal);
        assert_1.default.strictEqual(literal.value, "baz");
        main_1.namedTypes.CallExpression.assert(call.expression);
        if (main_1.namedTypes.CallExpression.check(call.expression)) {
            assert_1.default.strictEqual(literal, call.expression.arguments[0]);
        }
        assert_1.default.deepEqual(unvisitedTypes, [
            "ExpressionStatement",
            "CallExpression"
            // Note that the MemberExpression and the Literal were visited
            // by their type-specific methods, so they were not visited by
            // the catch-all visitNode method.
        ]);
    });
    it("should visit comments", function () {
        var ast = esprima_1.parse([
            "function getArgs(/*arguments*/) {",
            "  // Turn arguments into an array.",
            "  return Array.prototype.slice.call(arguments);",
            "}"
        ].join("\n"), {
            comment: true
        });
        var blockComments = [];
        var lineComments = [];
        main_1.visit(ast, {
            visitComment: function (path) {
                this.traverse(path);
                if (main_1.namedTypes.Block.check(path.value)) {
                    blockComments.push(path.value);
                }
                else if (main_1.namedTypes.Line.check(path.value)) {
                    lineComments.push(path.value);
                }
            }
        });
        assert_1.default.strictEqual(blockComments.length, 1);
        assert_1.default.strictEqual(blockComments[0].value, "arguments");
        assert_1.default.strictEqual(lineComments.length, 1);
        assert_1.default.strictEqual(lineComments[0].value, " Turn arguments into an array.");
        blockComments.length = 0;
        lineComments.length = 0;
        main_1.visit(ast, {
            visitBlock: function (path) {
                blockComments.push(path.value);
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(blockComments.length, 1);
        assert_1.default.strictEqual(blockComments[0].value, "arguments");
        assert_1.default.strictEqual(lineComments.length, 0);
        blockComments.length = 0;
        lineComments.length = 0;
        main_1.visit(ast, {
            visitLine: function (path) {
                lineComments.push(path.value);
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(blockComments.length, 0);
        assert_1.default.strictEqual(lineComments.length, 1);
        assert_1.default.strictEqual(lineComments[0].value, " Turn arguments into an array.");
        blockComments.length = 0;
        lineComments.length = 0;
        main_1.visit(ast, {
            visitBlock: function (path) {
                blockComments.push(path.value);
                this.traverse(path);
            },
            visitLine: function (path) {
                lineComments.push(path.value);
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(blockComments.length, 1);
        assert_1.default.strictEqual(blockComments[0].value, "arguments");
        assert_1.default.strictEqual(lineComments.length, 1);
        assert_1.default.strictEqual(lineComments[0].value, " Turn arguments into an array.");
    });
});
describe("path traversal", function () {
    var call = main_1.builders.expressionStatement(main_1.builders.callExpression(main_1.builders.memberExpression(main_1.builders.identifier("foo"), main_1.builders.identifier("bar"), false), [main_1.builders.literal("baz")]));
    it("should accept root paths as well as AST nodes", function () {
        var path = new main_1.NodePath(call).get("expression", "callee");
        var idCount = 0;
        // Note that we're passing a path instead of a node as the first
        // argument to types.traverse.
        main_1.visit(path, {
            visitIdentifier: function (path) {
                var node = path.node;
                ++idCount;
                if (node.name === "bar") {
                    main_1.namedTypes.MemberExpression.assert(path.parent.node);
                    main_1.namedTypes.CallExpression.assert(path.parent.parent.node);
                    main_1.namedTypes.ExpressionStatement.assert(path.parent.parent.parent.node);
                }
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(idCount, 2);
    });
});
describe("replacing the root", function () {
    var ast = main_1.builders.expressionStatement(main_1.builders.unaryExpression("!", main_1.builders.sequenceExpression([
        main_1.builders.identifier("a"),
        main_1.builders.identifier("b"),
        main_1.builders.identifier("c")
    ])));
    it("should be possible", function () {
        var callExp = main_1.visit(ast, {
            visitExpressionStatement: function (path) {
                path.replace(main_1.builders.callExpression(main_1.builders.identifier("f"), [
                    path.node.expression
                ]));
                this.traverse(path);
            }
        });
        main_1.namedTypes.CallExpression.assert(callExp, true);
    });
});
describe("NodePath", function () {
    it("should have the expected type hierarchy", function () {
        assert_1.default.strictEqual(new main_1.Path({}).constructor, main_1.Path);
        var np = new main_1.NodePath(main_1.builders.identifier("foo"));
        assert_1.default.strictEqual(np.constructor, main_1.NodePath);
        assert_1.default.ok(np.get("name") instanceof main_1.NodePath);
    });
    var ast = main_1.builders.expressionStatement(main_1.builders.unaryExpression("!", main_1.builders.sequenceExpression([
        main_1.builders.identifier("a"),
        main_1.builders.identifier("b"),
        main_1.builders.identifier("c")
    ])));
    var path = new main_1.NodePath(ast);
    it("should have sane values, nodes, parents", function () {
        var opPath = path.get("expression", "operator");
        assert_1.default.strictEqual(opPath.value, "!");
        assert_1.default.strictEqual(opPath.node, ast.expression);
        assert_1.default.strictEqual(opPath.parent, path);
        assert_1.default.strictEqual(opPath.parent.node, ast);
    });
    var binaryYield = main_1.builders.expressionStatement(main_1.builders.logicalExpression("&&", main_1.builders.yieldExpression(main_1.builders.identifier("a"), false), main_1.builders.yieldExpression(main_1.builders.identifier("b"), true)));
    it("should support .needsParens()", function () {
        var argPath = path.get("expression", "argument");
        assert_1.default.ok(argPath.needsParens());
        var exprsPath = argPath.get("expressions");
        assert_1.default.ok(!exprsPath.needsParens());
        assert_1.default.strictEqual(exprsPath.get("length").value, 3);
        assert_1.default.ok(!exprsPath.get(1).needsParens());
        var byPath = new main_1.NodePath(binaryYield);
        assert_1.default.ok(!byPath.get("expression").needsParens());
        assert_1.default.ok(byPath.get("expression", "left").needsParens());
        assert_1.default.ok(byPath.get("expression", "right").needsParens());
        var sequenceAssignmentAST = main_1.builders.assignmentExpression('=', main_1.builders.identifier('a'), main_1.builders.sequenceExpression([main_1.builders.literal(1), main_1.builders.literal(2)]));
        var sequenceAssignmentPath = new main_1.NodePath(sequenceAssignmentAST);
        assert_1.default.ok(sequenceAssignmentPath.get("right").needsParens());
    });
    it("should support .needsParens(true)", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("(function(){})"));
        var funExpPath = programPath.get("body", 0, "expression");
        main_1.namedTypes.FunctionExpression.assert(funExpPath.value);
        assert_1.default.strictEqual(funExpPath.needsParens(), true);
        assert_1.default.strictEqual(funExpPath.canBeFirstInStatement(), false);
        assert_1.default.strictEqual(funExpPath.firstInStatement(), true);
        assert_1.default.strictEqual(funExpPath.needsParens(true), false);
        programPath = new main_1.NodePath(esprima_1.parse("({ foo: 42 })"));
        var objLitPath = programPath.get("body", 0, "expression");
        main_1.namedTypes.ObjectExpression.assert(objLitPath.value);
        assert_1.default.strictEqual(objLitPath.needsParens(), true);
        assert_1.default.strictEqual(objLitPath.canBeFirstInStatement(), false);
        assert_1.default.strictEqual(objLitPath.firstInStatement(), true);
        assert_1.default.strictEqual(objLitPath.needsParens(true), false);
    });
    it("should prune redundant variable declaration nodes", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("(function(){var y = 1,x = 2;})"));
        var funBlockStatementPath = programPath.get("body", 0, "expression", "body");
        var variableDeclaration = funBlockStatementPath.get("body", 0);
        var yVariableDeclaratorPath = variableDeclaration.get("declarations", 0);
        var xVariableDeclaratorPath = variableDeclaration.get("declarations", 1);
        main_1.namedTypes.VariableDeclarator.assert(yVariableDeclaratorPath.node);
        main_1.namedTypes.VariableDeclarator.assert(xVariableDeclaratorPath.node);
        var remainingNodePath = yVariableDeclaratorPath.prune();
        assert_1.default.strictEqual(remainingNodePath, variableDeclaration);
        remainingNodePath = xVariableDeclaratorPath.prune();
        assert_1.default.strictEqual(remainingNodePath, funBlockStatementPath);
        assert_1.default.strictEqual(funBlockStatementPath.get("body", 0).value, undefined);
    });
    it("should prune redundant expression statement nodes", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("(function(){key = 'value';})"));
        var funBlockStatementPath = programPath.get("body", 0, "expression", "body");
        var assignmentExpressionPath = funBlockStatementPath.get("body", 0, "expression");
        main_1.namedTypes.AssignmentExpression.assert(assignmentExpressionPath.node);
        var remainingNodePath = assignmentExpressionPath.prune();
        assert_1.default.strictEqual(remainingNodePath, funBlockStatementPath);
        assert_1.default.strictEqual(funBlockStatementPath.value.body.length, 0);
    });
    it("should prune redundant if statement node if no consequent and alternate remain after prune", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("if(true){var t = 0;}"));
        var consequentNodePath = programPath.get("body", 0, "consequent");
        main_1.namedTypes.BlockStatement.assert(consequentNodePath.node);
        var remainingNodePath = consequentNodePath.prune();
        var testExpressionNodePath = programPath.get("body", 0);
        main_1.namedTypes.ExpressionStatement.assert(remainingNodePath.node);
        assert_1.default.strictEqual(remainingNodePath, testExpressionNodePath);
    });
    it("should modify if statement node if consequent is pruned and alternate remains", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("if(x > 10){var t = 0;}else{var f = 2;}"));
        var consequentNodePath = programPath.get("body", 0, "consequent");
        main_1.namedTypes.BlockStatement.assert(consequentNodePath.node);
        var remainingNodePath = consequentNodePath.prune();
        var modifiedIfStatementNodePath = programPath.get("body", 0);
        var negatedTestExpression = modifiedIfStatementNodePath.get("test");
        main_1.namedTypes.IfStatement.assert(remainingNodePath.node);
        main_1.namedTypes.UnaryExpression.assert(negatedTestExpression.node);
        assert_1.default.strictEqual(remainingNodePath, modifiedIfStatementNodePath);
        assert_1.default.strictEqual(negatedTestExpression.node.operator, "!");
    });
    it("should modify if statement node if consequent is pruned, alternate remains with no double negation", function () {
        var programPath = new main_1.NodePath(esprima_1.parse("if(!condition){var t = 0;}else{var f = 2;}"));
        var consequentNodePath = programPath.get("body", 0, "consequent");
        main_1.namedTypes.BlockStatement.assert(consequentNodePath.node);
        var remainingNodePath = consequentNodePath.prune();
        var modifiedIfStatementNodePath = programPath.get("body", 0);
        var testExpression = modifiedIfStatementNodePath.get("test");
        main_1.namedTypes.IfStatement.assert(remainingNodePath.node);
        main_1.namedTypes.Identifier.assert(testExpression.node);
        assert_1.default.strictEqual(remainingNodePath, modifiedIfStatementNodePath);
    });
});
describe("path.replace", function () {
    var ast;
    beforeEach(function () {
        ast = main_1.builders.functionDeclaration(main_1.builders.identifier("fn"), [], main_1.builders.blockStatement([
            main_1.builders.variableDeclaration("var", [main_1.builders.variableDeclarator(main_1.builders.identifier("a"), null)])
        ]));
    });
    it("should support replacement with a single node", function () {
        main_1.visit(ast, {
            visitIdentifier: function (path) {
                if (path.node.name === "a") {
                    path.replace(main_1.builders.identifier("b"));
                }
                this.traverse(path);
            }
        });
        assert_1.default.equal(ast.body.body[0].declarations[0].id.name, "b");
    });
    it("should support replacement in an array with a single node", function () {
        main_1.visit(ast, {
            visitVariableDeclaration: function (path) {
                path.replace(main_1.builders.returnStatement(null));
                this.traverse(path);
            }
        });
        assert_1.default.equal(ast.body.body.length, 1);
        assert_1.default.ok(main_1.namedTypes.ReturnStatement.check(ast.body.body[0]));
    });
    it("should support replacement with nothing", function () {
        main_1.visit(ast, {
            visitVariableDeclaration: function (path) {
                path.replace();
                this.traverse(path);
            }
        });
        assert_1.default.equal(ast.body.body.length, 0);
    });
    it("should support replacement with itself plus more in an array", function () {
        main_1.visit(ast, {
            visitVariableDeclaration: function (path) {
                var scopeBody = path.scope.path.get("body", "body");
                // This is contrived such that we just happen to be replacing
                // the same node we're currently processing, perhaps using a
                // helper function to create variables at the top of the scope.
                assert_1.default.strictEqual(scopeBody.get(0), path);
                // Prepend `var $$;` inside the block. This should update our
                // `this` NodePath to correct its array index so that a
                // subsequent replace will still work.
                scopeBody.get(0).replace(main_1.builders.variableDeclaration("var", [main_1.builders.variableDeclarator(main_1.builders.identifier("$$"), null)]), scopeBody.get(0).value);
                // Now do it again to make sure all the other indexes are
                // updated, too.
                scopeBody.get(0).replace(main_1.builders.variableDeclaration("var", [main_1.builders.variableDeclarator(main_1.builders.identifier("$2"), null)]), scopeBody.get(0).value);
                assert_1.default.strictEqual(scopeBody.get(0), path);
                // Then replace the node, not the one we just added.
                return main_1.builders.returnStatement(main_1.builders.identifier("$3"));
            }
        });
        var statements = ast.body.body;
        assert_1.default.deepEqual(statements.map(function (node) { return node.type; }), ['ReturnStatement', 'VariableDeclaration', 'VariableDeclaration']);
        main_1.namedTypes.ReturnStatement.assert(statements[0]);
        assert_1.default.equal(statements[0].argument.name, "$3");
        main_1.namedTypes.VariableDeclaration.assert(statements[1]);
        assert_1.default.equal(statements[1].declarations[0].id.name, "$$");
        main_1.namedTypes.VariableDeclaration.assert(statements[2]);
        assert_1.default.equal(statements[2].declarations[0].id.name, "a");
    });
    it("should not throw when replacing the same node twice", function () {
        main_1.visit(ast, {
            visitVariableDeclaration: function (path) {
                path.replace(main_1.builders.expressionStatement(main_1.builders.literal(null)));
                main_1.namedTypes.ExpressionStatement.assert(path.value);
                main_1.namedTypes.Literal.assert(path.value.expression);
                assert_1.default.strictEqual(path.value.expression.value, null);
                path.replace(main_1.builders.expressionStatement(main_1.builders.literal("OK")));
                main_1.namedTypes.ExpressionStatement.assert(path.value);
                main_1.namedTypes.Literal.assert(path.value.expression);
                assert_1.default.strictEqual(path.value.expression.value, "OK");
                if (path.parentPath.get(path.name) !== path) {
                    assert_1.default.ok(false, "Should have reused the same path");
                }
                this.traverse(path);
            }
        });
    });
});
describe("global scope", function () {
    var scope = [
        "var foo = 42;",
        "function bar(baz) {",
        "  return baz + foo;",
        "}"
    ];
    var ast = esprima_1.parse(scope.join("\n"));
    it("should be reachable from nested scopes", function () {
        var globalScope;
        main_1.visit(ast, {
            visitProgram: function (path) {
                assert_1.default.strictEqual(path.scope.isGlobal, true);
                globalScope = path.scope;
                this.traverse(path);
            },
            visitFunctionDeclaration: function (path) {
                var node = path.node;
                assert_1.default.strictEqual(path.scope.isGlobal, false);
                assert_1.default.strictEqual(node.id.name, "bar");
                assert_1.default.notStrictEqual(path.scope, globalScope);
                assert_1.default.strictEqual(path.scope.isGlobal, false);
                assert_1.default.strictEqual(path.scope.parent, globalScope);
                assert_1.default.strictEqual(path.scope.getGlobalScope(), globalScope);
                this.traverse(path);
            }
        });
    });
    it("should be found by .lookup and .declares", function () {
        var globalScope;
        main_1.visit(ast, {
            visitProgram: function (path) {
                assert_1.default.strictEqual(path.scope.isGlobal, true);
                globalScope = path.scope;
                this.traverse(path);
            },
            visitFunctionDeclaration: function (path) {
                assert_1.default.ok(globalScope.declares("foo"));
                assert_1.default.ok(globalScope.declares("bar"));
                assert_1.default.strictEqual(path.scope.lookup("foo"), globalScope);
                assert_1.default.strictEqual(path.scope.lookup("bar"), globalScope);
                assert_1.default.ok(path.scope.declares("baz"));
                assert_1.default.strictEqual(path.scope.lookup("baz"), path.scope);
                assert_1.default.strictEqual(path.scope.lookup("qux"), null);
                assert_1.default.strictEqual(globalScope.lookup("baz"), null);
                this.traverse(path);
            }
        });
    });
});
describe("scope methods", function () {
    var scope = [
        "var foo = 42;",
        "function bar(baz) {",
        "  return baz + foo;",
        "}",
        "var nom = function rom(pom) {",
        "  var zom;",
        "  return rom(pom);",
        "};"
    ];
    it("getBindings should get local and global scope bindings", function () {
        var ast = esprima_1.parse(scope.join("\n"));
        var checked = [];
        main_1.visit(ast, {
            visitProgram: function (path) {
                var bindings = path.scope.getBindings();
                assert_1.default.deepEqual(["bar", "foo", "nom"], Object.keys(bindings).sort());
                assert_1.default.equal(1, bindings.foo.length);
                assert_1.default.equal(1, bindings.bar.length);
                checked.push(path.node);
                this.traverse(path);
            },
            visitFunctionDeclaration: function (path) {
                var bindings = path.scope.getBindings();
                assert_1.default.deepEqual(["baz"], Object.keys(bindings));
                assert_1.default.equal(1, bindings.baz.length);
                checked.push(path.node);
                this.traverse(path);
            },
            visitReturnStatement: function (path) {
                var node = path.node;
                if (main_1.namedTypes.CallExpression.check(node.argument) &&
                    main_1.namedTypes.Identifier.check(node.argument.callee) &&
                    node.argument.callee.name === "rom") {
                    var bindings = path.scope.getBindings();
                    assert_1.default.deepEqual(["pom", "rom", "zom"], Object.keys(bindings).sort());
                    checked.push(node);
                }
                this.traverse(path);
            }
        });
        assert_1.default.deepEqual(checked.map(function (node) { return node.type; }), ['Program', 'FunctionDeclaration', 'ReturnStatement']);
    });
    it("getBindings should work for import statements (esprima-fb)", function () {
        var ast = esprimaFb.parse([
            "import {x, y as z} from 'xy';",
            "import xyDefault from 'xy';",
            "import * as xyNamespace from 'xy';"
        ].join("\n"), { sourceType: "module" });
        var names;
        main_1.visit(ast, {
            visitProgram: function (path) {
                names = Object.keys(path.scope.getBindings()).sort();
                this.traverse(path);
            }
        });
        assert_1.default.deepEqual(names, ["x", "xyDefault", "xyNamespace", "z"]);
    });
    it("getBindings should work for import statements (acorn)", function () {
        var ast = shared_1.babylonParse([
            "import {x, y as z} from 'xy';",
            "import xyDefault from 'xy';",
            "import * as xyNamespace from 'xy';"
        ].join("\n"), {
            sourceType: "module",
            ecmaVersion: 6
        });
        var names;
        main_1.visit(ast, {
            visitProgram: function (path) {
                names = Object.keys(path.scope.getBindings()).sort();
                this.traverse(path);
            }
        });
        assert_1.default.deepEqual(names, ["x", "xyDefault", "xyNamespace", "z"]);
    });
    describe("getBindings should work with destructuring operations", function () {
        var code = "\nfunction aFunction(arg1, { arg2 }) {\n  const { arg3, nested: { something: arg4 } } = arg1;\n  const [arg5] = arg1;\n  return 0;\n}";
        var _loop_1 = function (parser, parserName) {
            it("produces the correct bindings with " + parserName + " parser", function () {
                var ast = parser(code);
                main_1.visit(ast, {
                    visitReturnStatement: function (path) {
                        var names = Object.keys(path.scope.getBindings()).sort();
                        assert_1.default.deepEqual(names, ["arg1", "arg2", "arg3", "arg4", "arg5"]);
                        return false;
                    }
                });
            });
        };
        for (var _i = 0, _a = [
            { parser: esprima_1.parse, parserName: "esprima" },
            { parser: shared_1.babylonParse, parserName: "babel" }
        ]; _i < _a.length; _i++) {
            var _b = _a[_i], parser = _b.parser, parserName = _b.parserName;
            _loop_1(parser, parserName);
        }
    });
    (nodeMajorVersion >= 6 ? it : xit)("should work for ES6 syntax (espree)", function () {
        var names;
        var ast = espree.parse([
            "var zap;",
            "export default function(zom) {",
            "    var innerFn = function(zip) {};",
            "    return innerFn(zom);",
            "};"
        ].join("\n"), {
            sourceType: "module",
            ecmaVersion: 6
        });
        main_1.visit(ast, {
            visitFunctionDeclaration: function (path) {
                names = Object.keys(path.scope.lookup("zap").getBindings()).sort();
                assert_1.default.deepEqual(names, ["zap"]);
                this.traverse(path);
            }
        });
    });
    it("should inject temporary into current scope", function () {
        var ast = esprima_1.parse(scope.join("\n"));
        var bindings;
        main_1.visit(ast, {
            visitProgram: function (path) {
                path.scope.injectTemporary();
                bindings = path.scope.getBindings();
                assert_1.default.deepEqual(["bar", "foo", "nom", "t$0$0"], Object.keys(bindings).sort());
                this.traverse(path);
            },
            visitFunctionDeclaration: function (path) {
                path.scope.injectTemporary(path.scope.declareTemporary("t$"));
                bindings = path.scope.getBindings();
                assert_1.default.deepEqual(["baz", "t$1$0"], Object.keys(bindings));
                this.traverse(path);
            }
        });
    });
    it("declareTemporary should use distinct names in nested scopes", function () {
        var ast = esprima_1.parse(scope.join("\n"));
        var globalVarDecl;
        var barVarDecl;
        var romVarDecl;
        main_1.visit(ast, {
            visitProgram: function (path) {
                path.get("body").unshift(globalVarDecl = main_1.builders.variableDeclaration("var", [
                    main_1.builders.variableDeclarator(path.scope.declareTemporary("$"), main_1.builders.literal("global")),
                    main_1.builders.variableDeclarator(path.scope.declareTemporary("$"), main_1.builders.literal("global"))
                ]));
                this.traverse(path);
            },
            visitFunction: function (path) {
                var funcId = path.value.id;
                var varDecl = main_1.builders.variableDeclaration("var", [
                    main_1.builders.variableDeclarator(path.scope.declareTemporary("$"), main_1.builders.literal(funcId.name + 1)),
                    main_1.builders.variableDeclarator(path.scope.declareTemporary("$"), main_1.builders.literal(funcId.name + 2))
                ]);
                path.get("body", "body").unshift(varDecl);
                if (funcId.name === "bar") {
                    barVarDecl = varDecl;
                }
                else if (funcId.name === "rom") {
                    romVarDecl = varDecl;
                }
                this.traverse(path);
            }
        });
        assert_1.default.strictEqual(globalVarDecl.declarations[0].id.name, "$0$0");
        assert_1.default.strictEqual(globalVarDecl.declarations[1].id.name, "$0$1");
        assert_1.default.strictEqual(barVarDecl.declarations[0].id.name, "$1$0");
        assert_1.default.strictEqual(barVarDecl.declarations[1].id.name, "$1$1");
        assert_1.default.strictEqual(romVarDecl.declarations[0].id.name, "$1$0");
        assert_1.default.strictEqual(romVarDecl.declarations[1].id.name, "$1$1");
    });
});
describe("catch block scope", function () {
    var catchWithVarDecl = [
        "function foo(e) {",
        "  try {",
        "    bar();",
        "  } catch (e) {",
        "    var f = e + 1;",
        "    return function(g) {",
        "      return e + g;",
        "    };",
        "  }",
        "  return f;",
        "}"
    ];
    var path = new main_1.NodePath(esprima_1.parse(catchWithVarDecl.join("\n")));
    var fooPath = path.get("body", 0);
    var fooScope = fooPath.scope;
    var catchPath = fooPath.get("body", "body", 0, "handler");
    var catchScope = catchPath.scope;
    it("should not affect outer scope declarations", function () {
        main_1.namedTypes.FunctionDeclaration.assert(fooScope.node);
        assert_1.default.strictEqual(fooScope.declares("e"), true);
        assert_1.default.strictEqual(fooScope.declares("f"), true);
        assert_1.default.strictEqual(fooScope.lookup("e"), fooScope);
    });
    it("should declare only the guard parameter", function () {
        main_1.namedTypes.CatchClause.assert(catchScope.node);
        assert_1.default.strictEqual(catchScope.declares("e"), true);
        assert_1.default.strictEqual(catchScope.declares("f"), false);
        assert_1.default.strictEqual(catchScope.lookup("e"), catchScope);
        assert_1.default.strictEqual(catchScope.lookup("f"), fooScope);
    });
    it("should shadow only the parameter in nested scopes", function () {
        var closurePath = catchPath.get("body", "body", 1, "argument");
        var closureScope = closurePath.scope;
        main_1.namedTypes.FunctionExpression.assert(closureScope.node);
        assert_1.default.strictEqual(closureScope.declares("e"), false);
        assert_1.default.strictEqual(closureScope.declares("f"), false);
        assert_1.default.strictEqual(closureScope.declares("g"), true);
        assert_1.default.strictEqual(closureScope.lookup("g"), closureScope);
        assert_1.default.strictEqual(closureScope.lookup("e"), catchScope);
        assert_1.default.strictEqual(closureScope.lookup("f"), fooScope);
    });
});
describe("array and object pattern scope", function () {
    function scopeFromPattern(pattern) {
        return new main_1.NodePath(main_1.builders.program([
            main_1.builders.variableDeclaration('var', [
                main_1.builders.variableDeclarator(pattern, null)
            ])
        ])).scope;
    }
    // ObjectPattern with Property and SpreadProperty
    // ArrayPattern with SpreadElement
    describe("esprima", function () {
        var types = fork_1.default([
            esprima_2.default
        ]);
        var b = types.builders;
        var objectPattern;
        var arrayPattern;
        beforeEach(function () {
            // {a, b: c, ...d}
            objectPattern = b.objectPattern([
                b.property('init', b.identifier('a'), b.identifier('a')),
                b.property('init', b.identifier('b'), b.identifier('c')),
                b.spreadProperty(b.identifier('d')),
            ]);
            // [foo, bar, ...baz]
            arrayPattern = b.arrayPattern([
                b.identifier('foo'),
                b.identifier('bar'),
                b.spreadElement(b.identifier('baz'))
            ]);
        });
        it("should handle object patterns variable declarations", function () {
            var scope = scopeFromPattern(objectPattern);
            assert_1.default.strictEqual(scope.declares("a"), true);
            assert_1.default.strictEqual(scope.declares("b"), false);
            assert_1.default.strictEqual(scope.declares("c"), true);
            assert_1.default.strictEqual(scope.declares("d"), true);
        });
        it("should handle array patterns in variable declarations", function () {
            var scope = scopeFromPattern(arrayPattern);
            assert_1.default.strictEqual(scope.declares("foo"), true);
            assert_1.default.strictEqual(scope.declares("bar"), true);
            assert_1.default.strictEqual(scope.declares("baz"), true);
        });
        it("should handle nested patterns in variable declarations", function () {
            // {a, b: c, ...d, e: [foo, bar, ...baz]}
            objectPattern.properties.push(b.property('init', b.identifier('e'), arrayPattern));
            var scope = scopeFromPattern(objectPattern);
            assert_1.default.strictEqual(scope.declares("a"), true);
            assert_1.default.strictEqual(scope.declares("b"), false);
            assert_1.default.strictEqual(scope.declares("c"), true);
            assert_1.default.strictEqual(scope.declares("d"), true);
            assert_1.default.strictEqual(scope.declares("e"), false);
            assert_1.default.strictEqual(scope.declares("foo"), true);
            assert_1.default.strictEqual(scope.declares("bar"), true);
            assert_1.default.strictEqual(scope.declares("baz"), true);
        });
    });
    // ObjectPattern with PropertyPattern and SpreadPropertyPattern
    // ArrayPatterhn with SpreadElementPattern
    describe("Mozilla Parser API", function () {
        var types = fork_1.default([
            core_1.default,
            es6_1.default,
            es7_1.default,
        ]);
        var b = types.builders;
        var objectPattern;
        var arrayPattern;
        beforeEach(function () {
            // {a, b: c, ...d}
            objectPattern = b.objectPattern([
                b.propertyPattern(b.identifier('a'), b.identifier('a')),
                b.propertyPattern(b.identifier('b'), b.identifier('c')),
                b.spreadPropertyPattern(b.identifier('d')),
            ]);
            // [foo, bar, ...baz]
            arrayPattern = b.arrayPattern([
                b.identifier('foo'),
                b.identifier('bar'),
                b.spreadElementPattern(b.identifier('baz'))
            ]);
        });
        it("should handle object patterns variable declarations", function () {
            var scope = scopeFromPattern(objectPattern);
            assert_1.default.strictEqual(scope.declares("a"), true);
            assert_1.default.strictEqual(scope.declares("b"), false);
            assert_1.default.strictEqual(scope.declares("c"), true);
            assert_1.default.strictEqual(scope.declares("d"), true);
        });
        it("should handle array patterns in variable declarations", function () {
            var scope = scopeFromPattern(arrayPattern);
            assert_1.default.strictEqual(scope.declares("foo"), true);
            assert_1.default.strictEqual(scope.declares("bar"), true);
            assert_1.default.strictEqual(scope.declares("baz"), true);
        });
        it("should handle nested patterns in variable declarations", function () {
            // {a, b: c, ...d, e: [foo, bar, ...baz]}
            objectPattern.properties.push(b.propertyPattern(b.identifier('e'), arrayPattern));
            var scope = scopeFromPattern(objectPattern);
            assert_1.default.strictEqual(scope.declares("a"), true);
            assert_1.default.strictEqual(scope.declares("b"), false);
            assert_1.default.strictEqual(scope.declares("c"), true);
            assert_1.default.strictEqual(scope.declares("d"), true);
            assert_1.default.strictEqual(scope.declares("e"), false);
            assert_1.default.strictEqual(scope.declares("foo"), true);
            assert_1.default.strictEqual(scope.declares("bar"), true);
            assert_1.default.strictEqual(scope.declares("baz"), true);
        });
    });
});
describe("types.defineMethod", function () {
    function at(loc) {
        main_1.namedTypes.SourceLocation.assert(loc);
        this.loc = loc;
    }
    var thisExpr = main_1.builders.thisExpression();
    it("should allow defining an .at method", function () {
        assert_1.default.strictEqual(main_1.defineMethod("at", at), void 0);
        assert_1.default.strictEqual(thisExpr.loc, null);
        thisExpr.at({
            start: {
                line: 1,
                column: 0,
            },
            end: {
                line: 1,
                column: 4,
            }
        });
        assert_1.default.strictEqual(thisExpr.loc.start.line, 1);
        assert_1.default.strictEqual(thisExpr.loc.start.column, 0);
        assert_1.default.strictEqual(thisExpr.loc.end.line, 1);
        assert_1.default.strictEqual(thisExpr.loc.end.column, 4);
    });
    it("should allow methods to be removed", function () {
        // Now try removing the method.
        assert_1.default.strictEqual(main_1.defineMethod("at"), at);
        assert_1.default.strictEqual(thisExpr.at, void 0);
        assert_1.default.strictEqual("at" in thisExpr, false);
    });
});
describe("types.visit", function () {
    var objProp;
    beforeEach(function () {
        objProp = main_1.builders.memberExpression(main_1.builders.identifier("object"), main_1.builders.identifier("property"), false);
    });
    it("should be identical to PathVisitor.visit", function () {
        assert_1.default.strictEqual(main_1.visit, main_1.PathVisitor.visit);
    });
    it("should work with no visitors", function () {
        var foo = main_1.builders.identifier("foo");
        assert_1.default.strictEqual(main_1.visit(foo), foo);
    });
    it("should allow simple tree modifications", function () {
        var bar = main_1.visit(main_1.builders.identifier("foo"), {
            visitIdentifier: function (path) {
                assert_1.default.ok(path instanceof main_1.NodePath);
                path.value.name = "bar";
                return false;
            }
        });
        main_1.namedTypes.Identifier.assert(bar);
        assert_1.default.strictEqual(bar.name, "bar");
    });
    it("should complain about missing this.traverse", function () {
        try {
            main_1.visit(objProp, {
                visitIdentifier: function (_path) {
                    // buh?
                }
            });
            assert_1.default.ok(false, "should have thrown an exception");
        }
        catch (err) {
            assert_1.default.strictEqual(err.message, "Must either call this.traverse or return false in visitIdentifier");
        }
    });
    it("should support this.traverse", function () {
        var idNames = [];
        main_1.visit(objProp, {
            visitMemberExpression: function (path) {
                this.traverse(path, {
                    visitIdentifier: function (path) {
                        idNames.push("*" + path.value.name + "*");
                        return false;
                    }
                });
                path.get("object", "name").replace("asdfasdf");
                path.get("property", "name").replace("zxcvzxcv");
                this.visit(path.get("property"));
            },
            visitIdentifier: function (path) {
                idNames.push(path.value.name);
                return false;
            }
        });
        assert_1.default.deepEqual(idNames, ["*object*", "*property*", "zxcvzxcv"]);
        idNames.length = 0;
        main_1.visit(objProp, {
            visitMemberExpression: function (path) {
                path.get("object", "name").replace("asdfasdf");
                path.get("property", "name").replace("zxcvzxcv");
                this.traverse(path, {
                    visitIdentifier: function (path) {
                        idNames.push(path.value.name);
                        return false;
                    }
                });
            }
        });
        assert_1.default.deepEqual(idNames, ["asdfasdf", "zxcvzxcv"]);
    });
    it("should support this.replace", function () {
        var seqExpr = main_1.builders.sequenceExpression([
            main_1.builders.literal("asdf"),
            main_1.builders.identifier("zxcv"),
            main_1.builders.thisExpression()
        ]);
        main_1.visit(seqExpr, {
            visitIdentifier: function (path) {
                assert_1.default.strictEqual(path.value.name, "zxcv");
                path.replace(main_1.builders.identifier("foo"), main_1.builders.identifier("bar"));
                return false;
            }
        });
        assert_1.default.strictEqual(seqExpr.expressions.length, 4);
        var foo = seqExpr.expressions[1];
        main_1.namedTypes.Identifier.assert(foo);
        assert_1.default.strictEqual(foo.name, "foo");
        var bar = seqExpr.expressions[2];
        main_1.namedTypes.Identifier.assert(bar);
        assert_1.default.strictEqual(bar.name, "bar");
        main_1.visit(seqExpr, {
            visitIdentifier: function (path) {
                if (path.value.name === "foo") {
                    path.replace(path.value, path.value);
                }
                return false;
            }
        });
        assert_1.default.strictEqual(seqExpr.expressions.length, 5);
        var foo = seqExpr.expressions[1];
        main_1.namedTypes.Identifier.assert(foo);
        assert_1.default.strictEqual(foo.name, "foo");
        var foo = seqExpr.expressions[2];
        main_1.namedTypes.Identifier.assert(foo);
        assert_1.default.strictEqual(foo.name, "foo");
        var bar = seqExpr.expressions[3];
        main_1.namedTypes.Identifier.assert(bar);
        assert_1.default.strictEqual(bar.name, "bar");
        main_1.visit(seqExpr, {
            visitLiteral: function (path) {
                path.replace();
                return false;
            },
            visitIdentifier: function (path) {
                if (path.value.name === "bar") {
                    path.replace();
                }
                return false;
            }
        });
        assert_1.default.strictEqual(seqExpr.expressions.length, 3);
        var first = seqExpr.expressions[0];
        main_1.namedTypes.Identifier.assert(first);
        assert_1.default.strictEqual(first.name, "foo");
        var second = seqExpr.expressions[1];
        assert_1.default.strictEqual(second, first);
        var third = seqExpr.expressions[2];
        main_1.namedTypes.ThisExpression.assert(third);
    });
    it("should reuse old VisitorContext objects", function () {
        var objectContext;
        var propertyContext;
        main_1.visit(objProp, {
            visitIdentifier: function (path) {
                assert_1.default.strictEqual(this.needToCallTraverse, true);
                this.traverse(path);
                assert_1.default.strictEqual(path.name, path.value.name);
                if (path.name === "object") {
                    objectContext = this;
                }
                else if (path.name === "property") {
                    propertyContext = this;
                }
            }
        });
        assert_1.default.ok(objectContext);
        assert_1.default.ok(propertyContext);
        assert_1.default.strictEqual(objectContext, propertyContext);
    });
    it("should dispatch to closest visitSupertype method", function () {
        var foo = main_1.builders.identifier("foo");
        var bar = main_1.builders.identifier("bar");
        var callExpr = main_1.builders.callExpression(main_1.builders.memberExpression(main_1.builders.functionExpression(main_1.builders.identifier("add"), [foo, bar], main_1.builders.blockStatement([
            main_1.builders.returnStatement(main_1.builders.binaryExpression("+", foo, bar))
        ])), main_1.builders.identifier("bind"), false), [main_1.builders.thisExpression()]);
        var nodes = [];
        var expressions = [];
        var identifiers = [];
        var statements = [];
        var returnStatements = [];
        var functions = [];
        function makeVisitorMethod(array) {
            return function (path) {
                array.push(path.value);
                this.traverse(path);
            };
        }
        main_1.visit(callExpr, {
            visitNode: makeVisitorMethod(nodes),
            visitExpression: makeVisitorMethod(expressions),
            visitIdentifier: makeVisitorMethod(identifiers),
            visitStatement: makeVisitorMethod(statements),
            visitReturnStatement: makeVisitorMethod(returnStatements),
            visitFunction: makeVisitorMethod(functions)
        });
        function check(array) {
            var rest = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                rest[_i - 1] = arguments[_i];
            }
            assert_1.default.strictEqual(array.length, rest.length);
            for (var i = 0; i < rest.length; ++i) {
                assert_1.default.strictEqual(array[i], rest[i]);
            }
        }
        check(nodes);
        check(expressions, callExpr, callExpr.callee, callExpr.callee.object.body.body[0].argument, callExpr.arguments[0]);
        check(identifiers, callExpr.callee.object.id, foo, bar, foo, bar, callExpr.callee.property);
        check(statements, callExpr.callee.object.body);
        check(returnStatements, callExpr.callee.object.body.body[0]);
        check(functions, callExpr.callee.object);
    });
    it("should replace this.currentPath with returned value", function () {
        assert_1.default.strictEqual(objProp.computed, false);
        main_1.visit(objProp, {
            visitIdentifier: function (path) {
                if (path.value.name === "property") {
                    path.parent.get("computed").replace(true);
                    return main_1.builders.callExpression(main_1.builders.memberExpression(main_1.builders.thisExpression(), main_1.builders.identifier("toString"), false), []);
                }
                this.traverse(path);
                return;
            },
            visitThisExpression: function (_path) {
                return main_1.builders.identifier("self");
            }
        });
        assert_1.default.strictEqual(objProp.computed, true);
        main_1.namedTypes.CallExpression.assert(objProp.property);
        var callee = objProp.property.callee;
        main_1.namedTypes.MemberExpression.assert(callee);
        main_1.namedTypes.Identifier.assert(callee.object);
        assert_1.default.strictEqual(callee.object.name, "self");
        main_1.namedTypes.Identifier.assert(callee.property);
        assert_1.default.strictEqual(callee.property.name, "toString");
        assert_1.default.deepEqual(objProp.property.arguments, []);
    });
});
describe("path.shift", function () {
    it("should work like Array.prototype.shift", function () {
        var path = new main_1.NodePath({
            elements: [0, "foo", true]
        });
        var first = path.get("elements", 0);
        assert_1.default.strictEqual(first.name, 0);
        var second = path.get("elements", 1);
        assert_1.default.strictEqual(second.name, 1);
        var third = path.get("elements", 2);
        assert_1.default.strictEqual(third.name, 2);
        assert_1.default.strictEqual(path.get("elements", "length").value, 3);
        assert_1.default.strictEqual(path.get("elements").shift(), first.value);
        assert_1.default.strictEqual(path.get("elements", "length").value, 2);
        assert_1.default.strictEqual(path.get("elements", 0), second);
        assert_1.default.strictEqual(path.get("elements", 1), third);
        assert_1.default.strictEqual(second.name, 0);
        assert_1.default.strictEqual(third.name, 1);
        assert_1.default.strictEqual(path.get("elements").shift(), second.value);
        assert_1.default.strictEqual(path.get("elements", "length").value, 1);
        assert_1.default.strictEqual(path.get("elements", 0), third);
        assert_1.default.strictEqual(third.name, 0);
        assert_1.default.strictEqual(path.get("elements").shift(), third.value);
        assert_1.default.strictEqual(path.get("elements").shift(), void 0);
        assert_1.default.strictEqual(path.get("elements", "length").value, 0);
    });
    it("should throw when path.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").shift();
        });
    });
});
describe("path.unshift", function () {
    it("should work like Array.prototype.unshift", function () {
        var path = new main_1.NodePath(main_1.builders.sequenceExpression([]));
        var elems = path.get("expressions");
        var one = main_1.builders.literal(1);
        var two = main_1.builders.literal(2);
        var three = main_1.builders.literal(3);
        var four = main_1.builders.literal(4);
        var five = main_1.builders.literal(5);
        assert_1.default.strictEqual(elems.get(1).parentPath, elems);
        assert_1.default.strictEqual(elems.get(1).node, path.value);
        assert_1.default.strictEqual(elems.get(1).parent, null);
        assert_1.default.strictEqual(elems.get("length").value, 0);
        elems.unshift(three, four, five);
        assert_1.default.deepEqual(path.value.expressions, [three, four, five]);
        var fourPath = elems.get(1);
        assert_1.default.strictEqual(fourPath.value.value, 4);
        elems.unshift(one, two);
        assert_1.default.deepEqual(elems.value, [one, two, three, four, five]);
        elems.unshift();
        assert_1.default.deepEqual(elems.value, [one, two, three, four, five]);
        assert_1.default.strictEqual(fourPath.name, 3);
        assert_1.default.strictEqual(elems.get("length").value, 5);
        assert_1.default.strictEqual(elems.get(1).parentPath, elems);
        assert_1.default.strictEqual(elems.get(1).node, two);
        assert_1.default.strictEqual(elems.get(1).parent, path);
    });
    it("should throw when path.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").unshift();
        });
    });
});
describe("path.push", function () {
    it("should work like Array.prototype.push", function () {
        var path = new main_1.NodePath({ elements: [0] });
        var elems = path.get("elements");
        assert_1.default.strictEqual(elems.get("length").value, 1);
        elems.push(1, 2, 3);
        assert_1.default.deepEqual(path.value.elements, [0, 1, 2, 3]);
        var two = elems.get(2);
        assert_1.default.strictEqual(two.value, 2);
        elems.push(4, 5);
        assert_1.default.deepEqual(elems.value, [0, 1, 2, 3, 4, 5]);
        elems.push();
        assert_1.default.deepEqual(elems.value, [0, 1, 2, 3, 4, 5]);
        assert_1.default.strictEqual(two.name, 2);
        assert_1.default.strictEqual(elems.get("length").value, 6);
    });
    it("should throw when path.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").push("asdf");
        });
    });
});
describe("path.pop", function () {
    it("should work like Array.prototype.pop", function () {
        var path = new main_1.NodePath({
            elements: [0, "foo", true]
        });
        var first = path.get("elements", 0);
        assert_1.default.strictEqual(first.name, 0);
        var second = path.get("elements", 1);
        assert_1.default.strictEqual(second.name, 1);
        var third = path.get("elements", 2);
        assert_1.default.strictEqual(third.name, 2);
        assert_1.default.strictEqual(path.get("elements", "length").value, 3);
        assert_1.default.strictEqual(path.get("elements").pop(), third.value);
        assert_1.default.strictEqual(path.get("elements", "length").value, 2);
        assert_1.default.strictEqual(path.get("elements", 0), first);
        assert_1.default.strictEqual(path.get("elements", 1), second);
        assert_1.default.strictEqual(first.name, 0);
        assert_1.default.strictEqual(second.name, 1);
        assert_1.default.strictEqual(path.get("elements").pop(), second.value);
        assert_1.default.strictEqual(path.get("elements", "length").value, 1);
        assert_1.default.strictEqual(path.get("elements", 0), first);
        assert_1.default.strictEqual(first.name, 0);
        assert_1.default.strictEqual(path.get("elements").pop(), first.value);
        assert_1.default.strictEqual(path.get("elements").pop(), void 0);
        assert_1.default.strictEqual(path.get("elements", "length").value, 0);
    });
    it("should throw when path.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").pop();
        });
    });
});
describe("path.insertAt", function () {
    it("should insert nodes at the given index", function () {
        var path = new main_1.NodePath({
            elements: [0, "foo", true]
        });
        var elems = path.get("elements");
        elems.insertAt(1, "a", "b");
        assert_1.default.deepEqual(elems.value, [0, "a", "b", "foo", true]);
        elems.insertAt(elems.get("length").value + 1, []);
        assert_1.default.deepEqual(elems.value, [0, "a", "b", "foo", true, , []]);
        assert_1.default.strictEqual(elems.get("length").value, 7);
        elems.insertAt(elems.get("length").value + 12345);
        assert_1.default.deepEqual(elems.value, [0, "a", "b", "foo", true, , []]);
        assert_1.default.strictEqual(elems.get("length").value, 7);
        elems.insertAt(-2, -2, -1);
        assert_1.default.deepEqual(elems.value, [-2, -1, 0, "a", "b", "foo", true, , []]);
        assert_1.default.strictEqual(elems.get("length").value, 9);
    });
    it("should insert nodes even when path.value is empty", function () {
        var path = new main_1.NodePath({
            elements: []
        });
        var elems = path.get("elements");
        elems.insertAt(0, 0, "foo", true);
        assert_1.default.deepEqual(elems.value, [0, "foo", true]);
        elems.replace([]);
        elems.insertAt(1, 0, "foo", true);
        assert_1.default.deepEqual(elems.value, [, 0, "foo", true]);
    });
    it("should throw when path.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").insertAt(0);
        });
    });
});
describe("path.insertBefore", function () {
    it("should insert nodes before the current path", function () {
        var zero = main_1.builders.literal(0);
        var one = main_1.builders.literal(1);
        var two = main_1.builders.literal(2);
        var foo = main_1.builders.literal("foo");
        var truth = main_1.builders.literal(true);
        var path = new main_1.NodePath(main_1.builders.sequenceExpression([zero, foo, truth]));
        var fooPath = path.get("expressions", 1);
        var truePath = path.get("expressions", 2);
        fooPath.insertBefore(one, two);
        assert_1.default.deepEqual(fooPath.parent.node.expressions, [zero, one, two, foo, truth]);
        assert_1.default.strictEqual(path.get("expressions", 3), fooPath);
        assert_1.default.strictEqual(fooPath.value.value, "foo");
        assert_1.default.strictEqual(path.get("expressions", 4), truePath);
        assert_1.default.strictEqual(truePath.value.value, true);
    });
    it("should throw when path.parentPath.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").insertBefore(0);
        });
    });
});
describe("path.insertAfter", function () {
    it("should insert nodes after the current path", function () {
        var zero = main_1.builders.literal(0);
        var one = main_1.builders.literal(1);
        var two = main_1.builders.literal(2);
        var foo = main_1.builders.literal("foo");
        var truth = main_1.builders.literal(true);
        var path = new main_1.NodePath(main_1.builders.sequenceExpression([zero, foo, truth]));
        var fooPath = path.get("expressions", 1);
        var truePath = path.get("expressions", 2);
        fooPath.insertAfter(one, two);
        assert_1.default.deepEqual(fooPath.parent.node.expressions, [zero, foo, one, two, truth]);
        assert_1.default.strictEqual(path.get("expressions", 1), fooPath);
        assert_1.default.strictEqual(fooPath.value.value, "foo");
        assert_1.default.strictEqual(path.get("expressions", 2).value.value, 1);
        assert_1.default.strictEqual(path.get("expressions", 3).value.value, 2);
        assert_1.default.strictEqual(path.get("expressions", 4), truePath);
        assert_1.default.strictEqual(truePath.value.value, true);
        var three = main_1.builders.literal(3);
        truePath.insertAfter(three);
        assert_1.default.deepEqual(fooPath.parent.node.expressions, [zero, foo, one, two, truth, three]);
    });
    it("should throw when path.parentPath.value not an array", function () {
        assert_1.default.throws(function () {
            new main_1.NodePath({ foo: 42 }).get("foo").insertAfter(0);
        });
    });
});
describe("types.astNodesAreEquivalent", function () {
    it("should work for simple values", function () {
        main_1.astNodesAreEquivalent.assert(1, 2 - 1);
        main_1.astNodesAreEquivalent.assert("1", 1);
        main_1.astNodesAreEquivalent.assert(true, !false);
        var d1 = new Date;
        var d2 = new Date(+d1);
        assert_1.default.notStrictEqual(d1, d2);
        main_1.astNodesAreEquivalent.assert(d1, d2);
        main_1.astNodesAreEquivalent.assert(/x/, /x/);
        assert_1.default.strictEqual(main_1.astNodesAreEquivalent(/x/g, /x/), false);
    });
    it("should work for arrays", function () {
        main_1.astNodesAreEquivalent.assert([], [1, 2, 3].slice(10));
        main_1.astNodesAreEquivalent.assert([1, 2, 3], [1].concat(2, [3]));
        main_1.astNodesAreEquivalent.assert([1, , 3], [1, , 3,]);
        assert_1.default.strictEqual(main_1.astNodesAreEquivalent([1, , 3], [1, void 0, 3]), false);
    });
    it("should work for objects", function () {
        main_1.astNodesAreEquivalent.assert({
            foo: 42,
            bar: "asdf"
        }, {
            bar: "asdf",
            foo: 42
        });
        assert_1.default.strictEqual(main_1.astNodesAreEquivalent({
            foo: 42,
            bar: "asdf",
            baz: true
        }, {
            bar: "asdf",
            foo: 42
        }), false);
        assert_1.default.strictEqual(main_1.astNodesAreEquivalent({
            foo: 42,
            bar: "asdf"
        }, {
            bar: "asdf",
            foo: 42,
            baz: true
        }), false);
    });
    it("should work for AST nodes", function () {
        function check(src1, src2) {
            main_1.astNodesAreEquivalent.assert(esprima_1.parse(src1), esprima_1.parse(src2));
        }
        function checkNot(src1, src2) {
            var ast1 = esprima_1.parse(src1, { loc: true, range: true });
            var ast2 = esprima_1.parse(src2, { loc: true });
            assert_1.default.throws(function () {
                main_1.astNodesAreEquivalent.assert(ast1, ast2);
            });
            var problemPath = [];
            main_1.astNodesAreEquivalent(esprima_1.parse(src1), esprima_1.parse(src2), problemPath);
            assert_1.default.notStrictEqual(problemPath.length, 0);
            var a = ast1;
            var b = ast2;
            problemPath.forEach(function (name) {
                assert_1.default.strictEqual(name in a, true);
                assert_1.default.strictEqual(name in b, true);
                a = a[name];
                b = b[name];
            });
            assert_1.default.notStrictEqual(a, b);
        }
        check("1\n;", "1;");
        check("console.log(this.toString(36));", [
            "// leading comment",
            "console.log(",
            "  this.toString(36)",
            "/* trailing comment */)"
        ].join("\n"));
        check("foo()", "foo /*anonymous*/ ()");
        check("new (bar(1,2)(3,4)).baz.call(null)", "new(  bar(     1,2)  \n  (3,4)).  baz.call(   null)");
        check([
            "(function(x) {",
            "  Foo = /asdf/.test(x);",
            "}());"
        ].join("\n"), [
            "(function(x) {",
            "  Foo = /asdf/.test(x);",
            "})();"
        ].join("\n\n"));
        checkNot([
            "(function(x) {",
            "  Foo = /asdf/.test(x);",
            "}());"
        ].join("\n"), [
            "(function(x) {",
            "  Foo = /asdf/.test(x);",
            "})('~asdf~');"
        ].join("\n\n"));
        checkNot([
            "(function(x) {",
            "  var Foo = /asdf/.test(x);",
            "}());"
        ].join("\n"), [
            "(function(x) {",
            "  Foo = /asdf/.test(x);",
            "})(/*'~asdf~'*/);"
        ].join("\n\n"));
    });
});
describe("RegExpLiteral nodes", function () {
    it("should have a default-computable .regex field", function () {
        var ast = esprima_1.parse('/x*/gmi.test("xxx")');
        var regExp;
        var statement = ast.body[0];
        if (statement.type === "ExpressionStatement" &&
            statement.expression.type === "CallExpression" &&
            statement.expression.callee.type === "MemberExpression" &&
            statement.expression.callee.object.type === "Literal") {
            regExp = statement.expression.callee.object;
        }
        assert_1.default(regExp !== undefined);
        if (regExp) {
            main_1.namedTypes.Literal.assert(regExp);
            isRegExp.assert(regExp.value);
            var regex = main_1.getFieldValue(regExp, "regex");
            regex.flags = regex.flags.split("").sort().join("");
            assert_1.default.deepEqual(regex, {
                pattern: "x*",
                flags: "gim"
            });
            main_1.Type.from({
                pattern: isString,
                flags: isString
            }).assert(regex);
        }
    });
    it("should typecheck with explicit .regex field", function () {
        var stringLiteral = main_1.builders.literal("asdf");
        assert_1.default.strictEqual(stringLiteral.regex, null);
        main_1.namedTypes.Literal.assert(stringLiteral, true);
        var regExpLiteral = main_1.builders.literal(/a.b/gi);
        assert_1.default.strictEqual(regExpLiteral.regex.pattern, "a.b");
        assert_1.default.strictEqual(regExpLiteral.regex.flags, "ig");
        main_1.namedTypes.Literal.assert(regExpLiteral, true);
        regExpLiteral.regex.pattern = 1234;
        assert_1.default.strictEqual(main_1.namedTypes.Literal.check(regExpLiteral, true), false);
    });
});
describe("BigIntLiteral nodes", function () {
    it("should parse correctly with Babylon", function () {
        var types = fork_1.default([
            babel_1.default,
        ]);
        var n = types.namedTypes;
        var BigIntLiteral = n.BigIntLiteral;
        function check(code) {
            parseAndCheck(code);
            parseAndCheck("-" + code);
            parseAndCheck("+" + code);
        }
        function parseAndCheck(code) {
            var program = shared_1.babylonParse(code);
            var exp = program.body[0].expression;
            if (n.UnaryExpression.check(exp)) {
                checkExp(exp.argument);
            }
            else {
                checkExp(exp);
            }
        }
        function checkExp(exp) {
            BigIntLiteral.assert(exp, true);
            assert_1.default.strictEqual(exp.extra.rawValue, exp.value);
            assert_1.default.strictEqual(exp.extra.raw, exp.value + "n");
            delete exp.extra;
            BigIntLiteral.assert(exp, true);
            var extra = types.getFieldValue(exp, "extra");
            assert_1.default.strictEqual(extra.rawValue, exp.value);
            assert_1.default.strictEqual(extra.raw, exp.value + "n");
        }
        check("0n");
        check("12345n");
        check("0b101011101n");
        check("0xFFF123n");
        check("0xfff123n");
        check("728374682736419273912879879610912837401293846n");
        check("0xc00cda0a30d6312b54c55789befdea84f5949d92n");
        check("0o16432n");
    });
});
describe("MemberExpression", function () {
    it("should set computed flag to false by default", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.identifier('bar'));
        assert_1.default.strictEqual(memberExpression.computed, false);
    });
    it("should not set computed to true if property is a callExpression", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.callExpression(main_1.builders.identifier('bar'), []));
        assert_1.default.strictEqual(memberExpression.computed, false);
    });
    it("should set computed flag to true if property is a literal", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.literal('bar'));
        assert_1.default.strictEqual(memberExpression.computed, true);
    });
    it("should set computed flag to true if property is a memberExpression", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.literal('bar')));
        assert_1.default.strictEqual(memberExpression.computed, true);
    });
    it("should set computed flag to true if property is a binaryExpression", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.literal('bar')));
        assert_1.default.strictEqual(memberExpression.computed, true);
    });
    it("should override computed value when passed as a third argument to the builder", function () {
        var memberExpression = main_1.builders.memberExpression(main_1.builders.identifier('foo'), main_1.builders.callExpression(main_1.builders.identifier('bar'), []), true);
        assert_1.default.strictEqual(memberExpression.computed, true);
    });
});
describe("Optional Chaining", function () {
    describe('OptionalMemberExpression', function () {
        it("should set optional to true by default", function () {
            var optionalMemberExpression = main_1.builders.optionalMemberExpression(main_1.builders.identifier('foo'), main_1.builders.identifier('bar'));
            assert_1.default.strictEqual(optionalMemberExpression.optional, true);
        });
        it("should allow optional to be false", function () {
            var optionalMemberExpression = main_1.builders.optionalMemberExpression(main_1.builders.identifier('foo'), main_1.builders.identifier('bar'), true, false);
            assert_1.default.strictEqual(optionalMemberExpression.optional, false);
        });
    });
    describe('OptionalCallExpression', function () {
        it("should set optional to true by default", function () {
            var optionalCallExpression = main_1.builders.optionalCallExpression(main_1.builders.identifier('foo'), []);
            assert_1.default.strictEqual(optionalCallExpression.optional, true);
        });
        it("should allow optional to be false", function () {
            var optionalCallExpression = main_1.builders.optionalCallExpression(main_1.builders.identifier('foo'), [], false);
            assert_1.default.strictEqual(optionalCallExpression.optional, false);
        });
    });
});
describe('Nullish Coalescing Operator', function () {
    it('should allow `??` as operator', function () {
        var logicalExpression = main_1.builders.logicalExpression("??", main_1.builders.identifier("a"), main_1.builders.identifier("b"));
        assert_1.default.strictEqual(logicalExpression.operator, "??");
    });
    it('should not allow `crap` as operator', function () {
        assert_1.default.throws(function () {
            main_1.builders.logicalExpression("crap", main_1.builders.identifier("a"), main_1.builders.identifier("b"));
        }, "does not match field \"operator\"");
    });
});
