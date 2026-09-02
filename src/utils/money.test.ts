import test from 'node:test'
import assert from 'node:assert/strict'
import { evalAmount } from './money.ts'

test('evalAmount: sums and single numbers', () => {
  assert.equal(evalAmount('100-18-20'), 62)
  assert.equal(evalAmount('100'), 100)
  assert.equal(evalAmount('10.5 + 2.25'), 12.75)
  assert.equal(evalAmount('  100  -  50 '), 50)
  assert.equal(evalAmount('-5+10'), 5)
  assert.equal(evalAmount('.5+.25'), 0.75)
})

test('evalAmount: rejects non +/- input', () => {
  assert.equal(evalAmount(''), null)
  assert.equal(evalAmount('   '), null)
  assert.equal(evalAmount('100x2'), null)
  assert.equal(evalAmount('100-'), null)
  assert.equal(evalAmount('abc'), null)
  assert.equal(evalAmount('100*2'), null)
  assert.equal(evalAmount('100/2'), null)
})
