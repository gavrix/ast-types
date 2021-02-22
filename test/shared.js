"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var esprima_1 = require("esprima");
exports.esprimaParse = esprima_1.parse;
var babylon_1 = require("reify/lib/parsers/babylon");
var main_1 = require("../main");
function validateECMAScript(file) {
    var fullPath = path_1.default.join(__dirname, "..", file);
    it("should validate " + file + " with Esprima", function (done) {
        fs_1.default.readFile(fullPath, "utf8", function (err, code) {
            if (err) {
                throw err;
            }
            main_1.namedTypes.Program.assert(esprima_1.parse(code), true);
            main_1.namedTypes.Program.assert(esprima_1.parse(code, {
                loc: true
            }), true);
            done();
        });
    });
    it("should validate " + file + " with Babylon", function (done) {
        fs_1.default.readFile(fullPath, "utf8", function (err, code) {
            if (err) {
                throw err;
            }
            var ast = babylonParse(code);
            main_1.namedTypes.Program.assert(ast, true);
            done();
        });
    });
}
exports.validateECMAScript = validateECMAScript;
;
function babylonParse(source, options) {
    var ast = babylon_1.parse(source, options);
    if (ast.type === "File")
        ast = ast.program;
    return ast;
}
exports.babylonParse = babylonParse;
// Helper for determining if we should care that a given type is not defined yet.
// TODO Periodically revisit this as proposals advance.
function isEarlyStageProposalType(typeName) {
    switch (typeName) {
        // The pipeline operator syntax is still at Stage 1:
        // https://github.com/tc39/proposals#stage-1
        case "PipelineTopicExpression":
        case "PipelineBareFunction":
        case "PipelinePrimaryTopicReference":
        // A Babel-specific AST innovation:
        // https://github.com/babel/babel/pull/9364
        case "Placeholder":
        // Partial application proposal (stage 1):
        // https://github.com/babel/babel/pull/9474
        case "ArgumentPlaceholder":
            return true;
        default:
            return false;
    }
}
exports.isEarlyStageProposalType = isEarlyStageProposalType;
