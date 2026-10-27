import assert from "node:assert/strict";
import test from "node:test";
import { aliasFromCnjNumber, getTribunalAlias, TRIBUNAL_ALIASES } from "./tribunais.ts";

const num = (j, tr) => `0001234-56.2025.${j}.${tr}.0001`;

test("Justica Estadual: 27 TJs, DF e o TJDFT", () => {
  assert.equal(aliasFromCnjNumber(num(8, "26")), "tjsp");
  assert.equal(aliasFromCnjNumber(num(8, "13")), "tjmg");
  assert.equal(aliasFromCnjNumber(num(8, "07")), "tjdft");
  assert.equal(aliasFromCnjNumber(num(8, "27")), "tjto");
  assert.equal(Object.keys(TRIBUNAL_ALIASES).filter((k) => k.startsWith("8.")).length, 27);
  assert.equal(aliasFromCnjNumber(num(8, "28")), null);
});

test("Justica Federal, Trabalho e superiores", () => {
  assert.equal(aliasFromCnjNumber(num(4, "03")), "trf3");
  assert.equal(aliasFromCnjNumber(num(4, "06")), "trf6");
  assert.equal(aliasFromCnjNumber(num(4, "07")), null);
  assert.equal(aliasFromCnjNumber(num(5, "02")), "trt2");
  assert.equal(aliasFromCnjNumber(num(5, "24")), "trt24");
  assert.equal(aliasFromCnjNumber(num(5, "25")), null);
  assert.equal(aliasFromCnjNumber(num(5, "00")), "tst");
  assert.equal(aliasFromCnjNumber(num(3, "00")), "stj");
  assert.equal(aliasFromCnjNumber(num(3, "01")), null);
});

test("Justica Eleitoral: 27 TREs na mesma ordem dos TJs e TSE", () => {
  assert.equal(aliasFromCnjNumber(num(6, "26")), "tre-sp");
  assert.equal(aliasFromCnjNumber(num(6, "13")), "tre-mg");
  assert.equal(aliasFromCnjNumber(num(6, "07")), "tre-dft");
  assert.equal(aliasFromCnjNumber(num(6, "00")), "tse");
  assert.equal(Object.keys(TRIBUNAL_ALIASES).filter((k) => k.startsWith("6.") && k !== "6.00").length, 27);
});

test("Justica Militar: STM (J=7) e TJMs (J=9)", () => {
  assert.equal(aliasFromCnjNumber(num(7, "00")), "stm");
  assert.equal(aliasFromCnjNumber(num(7, "12")), "stm");
  assert.equal(aliasFromCnjNumber(num(7, "13")), null);
  assert.equal(aliasFromCnjNumber(num(9, "13")), "tjmmg");
  assert.equal(aliasFromCnjNumber(num(9, "21")), "tjmrs");
  assert.equal(aliasFromCnjNumber(num(9, "26")), "tjmsp");
  assert.equal(aliasFromCnjNumber(num(9, "01")), null);
});

test("numero invalido ou J nao coberto nao gera alias", () => {
  assert.equal(aliasFromCnjNumber("123"), null);
  assert.equal(aliasFromCnjNumber(num(2, "00")), null);
  assert.equal(getTribunalAlias("8", "26"), "tjsp");
  assert.equal(aliasFromCnjNumber("00012345620258260001"), "tjsp");
});
