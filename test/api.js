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
var main_1 = require("../main");
var types = __importStar(require("../main"));
describe("namedTypes", function () {
    it("should work as a namespace", function () {
        var id = main_1.builders.identifier("oyez");
        main_1.namedTypes.Identifier.assert(id);
    });
    it("should work as a type", function () {
        function getIdName(id) {
            return id.name;
        }
        assert_1.default.strictEqual(getIdName(main_1.builders.identifier("oyez")), "oyez");
    });
    it("should work as a value", function () {
        assert_1.default.strictEqual(typeof main_1.namedTypes, "object");
        assert_1.default.strictEqual(typeof main_1.namedTypes.IfStatement, "object");
    });
});
describe("types.namedTypes", function () {
    it("should work as a namespace", function () {
        var id = types.builders.identifier("oyez");
        types.namedTypes.Identifier.assert(id);
    });
    it("should work as a type", function () {
        function getIdName(id) {
            return id.name;
        }
        assert_1.default.strictEqual(getIdName(types.builders.identifier("oyez")), "oyez");
    });
    it("should work as a value", function () {
        assert_1.default.strictEqual(typeof types.namedTypes, "object");
        assert_1.default.strictEqual(typeof types.namedTypes.IfStatement, "object");
    });
});
