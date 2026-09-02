import test from 'node:test'
import assert from 'node:assert/strict'
import { guessCategory } from './categoryGuess.ts'

test('guessCategory: brands and terms', () => {
  assert.equal(guessCategory('Swiggy dinner'), 'food')
  assert.equal(guessCategory('zomato'), 'food')
  assert.equal(guessCategory('Blinkit order'), 'groceries')
  assert.equal(guessCategory('Uber to office'), 'transport')
  assert.equal(guessCategory('petrol'), 'transport')
  assert.equal(guessCategory('House rent March'), 'rent')
  assert.equal(guessCategory('rent'), 'rent')
  assert.equal(guessCategory('BookMyShow tickets'), 'entertainment')
  assert.equal(guessCategory('Electricity bill'), 'household')
  assert.equal(guessCategory('Indigo flight to Goa'), 'travel')
  assert.equal(guessCategory('Amazon order'), 'shopping')
  assert.equal(guessCategory('PharmEasy medicines'), 'medical')
  assert.equal(guessCategory('Cult fit membership'), 'fitness')
  assert.equal(guessCategory('Spa day'), 'selfcare')
  assert.equal(guessCategory('spa'), 'selfcare')
})

test('guessCategory: longer phrase wins over shorter', () => {
  assert.equal(guessCategory('Amazon Prime subscription'), 'entertainment')
  assert.equal(guessCategory('gym membership'), 'fitness')
})

test('guessCategory: no match', () => {
  assert.equal(guessCategory(''), null)
  assert.equal(guessCategory('random stuff xyz'), null)
  assert.equal(guessCategory('split with roommates'), null)
})
