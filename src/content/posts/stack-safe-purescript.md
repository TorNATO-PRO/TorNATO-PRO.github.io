---
title: "Stack-Safe PureScript"
description: "Functions over lists, in general, are quite easy to make stack safe. However, how does one make stack safe computations over a tree, or a computation that builds up a tree?"
publishDate: 2025-10-05
tags: ["purescript", "stack-safety", "tail-recursion", "continuation-passing-style"]
draft: false
---

# NOTE - IN PROGRESS

# Tail Recursion

If you have experience programming, you might avoid writing recursive functions due to a fear of overloading the stack with function calls, and you might view recursion in general as more of a toy than something that you can use in your day job. **Tail recursion** is a solution to this problem. It is a technique that allows you, the programmer, to trade stack space for heap space by writing a recursive function such that on each branch, the self-recursive call is the final action (first-order). This transformation enables **tail-call optimization**, allowing such functions to execute without growing the call stack. However, not all languages implement tail-call optimizations, so this solution is not yet a panacea. You can add this technique to your toolbox for making stack safe functions.

```purescript
-- CANNOT TCO
-- The recursive call to foldr' fn acc xs is inside an argument to `fn`.
-- After the inner call to foldr' returns, you still need to compute fn.
-- There is work left to do after the recursive call, thus the call isn't in
-- tail position.
foldr' :: ∀ a b. (a -> b -> b) -> b -> List a -> b
foldr' _ acc Nil = acc
foldr' fn acc (Cons x xs) = fn x (foldr' fn acc xs)

-- TCO Possible
-- The recursive call is the final action. You compute the accumulator value first
-- and then make a tail call to foldl'. No extra work remains
foldl' :: ∀ a b. (b -> a -> b) -> b -> List a -> b
foldl' _ acc Nil = acc
foldl' fn acc (Cons x xs) = foldl' fn (fn acc x) xs
```

## Continuation Passing Style

Continuation passing style is one way to convert a recursive function where the recursive function call is possibly not in tail position into a one where it is. Using this approach, we effectively pass an additional function that takes the result of the computation as a parameter and returns that parameter with something, but perhaps nothing, applied to the result. I can attempt to explain this, but I will let more practiced hands, such as [Matt Might](https://matt.might.net/), explain - he will do a much better job. Additionally, [Kristopher Micinski](https://kmicinski.com/) has a great video on the topic as well.

<iframe src="https://www.youtube.com/embed/1WXnSq5k790?si=UWgWED1ugdZHwZyH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="margin-block: 2rem; width: calc(100vw - 4rem); max-width: 100%; height: auto; aspect-ratio: 16/9;"></iframe>

Let's use this idea, and then convert that above `foldr'` function into one that is stack safe. This will allow us to avoid overflowing the stack and causing a pesky runtime crash.

```purescript
foldrCPS :: ∀ a b. (a -> b -> b) -> b -> List a -> b
foldrCPS fn acc lst = go lst identity
  where
  go Nil k = k acc
  go (Cons x xs) k = go xs (\res -> k (fn x res))
```

Great, now our function is stack safe? Now lets try running the code on a large list using spago repl with Purescript `0.15.15`. If you are like me, you probably just encountered a runtime crash!

```
> foldrCPS (\x xs -> x + xs) 0 $ List.range 0 100000
file:///Users/nathanwaltz/Documents/Prototype/.psci_modules/$PSCI/index.js:5
var it = /* #__PURE__ */ Rose["foldr$prime$prime"](function (x) {
                                                            ^

RangeError: Maximum call stack size exceeded
```

Well, that’s not great. Was this entire post a lie? Not exactly. This is exactly what I did when I first saw Kristopher Micinski’s video - except I used the Fibonacci function. As it turns out, PureScript compiles to JavaScript, which does not reliably support tail-call optimization (TCO). Additionally, PureScript itself doesn’t always perform tail-call elimination for self-recursive functions (as we just saw above).

## tailrec

Luckily for us, Jordan Martinez has written a typeclass in a library called [tailrec](https://pursuit.purescript.org/packages/purescript-tailrec/6.1.0), which "captures stack-safe monadic tail recursion". As PureScript programmers, we can use this typeclass to force stack-safe evaluation by rewriting self-recursive computations in a way that PureScript can compile to Javascript in a stack safe manner. 

Now lets look at the function signature for `tailRec`, which "creates a pure tail-recursive function of one argument".

```purescript 
tailRec :: forall a b. (a -> Step a b) -> a -> b

-- example
pow :: Int -> Int -> Int
pow n p = tailRec go { accum: 1, power: p }
  where
  go :: _ -> Step _ Int
  go { accum: acc, power: 0 } = Done acc
  go { accum: acc, power: p } = Loop { accum: acc * n, power: p - 1 }
```

Great, so `tailRec` takes a function from `a -> Step a b`, an initial value of type `a`, and returns some `b` as the result.

Lets look at the `Step a b` type now. It turns out that this type is isomorphic to `Either a b`.

```purescript
data Step a b = Loop a | Done b
```

Here, `a` can be seen as the type of the parameter that we operate on in the recursive call, and `b` is the type of the final result. Lets apply this to our `foldrCPS` function so we can avoid blowing up the stack.

```purescript
newtype State a b = State
  { k :: b -> Step (State a b ) b
  , lst :: List a
  }

foldrCPS' :: ∀ a b. (a -> b -> b) -> b -> List a -> b
foldrCPS' fn acc lst = tailRec go (State { lst, k: Done })
  where
  go (State { lst: Nil, k }) = k acc
  go (State { lst: Cons x xs, k }) = Loop (State { lst: xs, k: \res -> k (fn x res) })
```

Now lets run it! Anddddd still the same problem. Well great, so it turns out that we are still building up a massive continuation. Once it was actually evaluated, we still ended up having to do all of the function calls and the closure of callbacks doesn't get turned into a loop. It turns out that tailRec isn't necessarily foolproof.

# Defunctionalization

Defunctionalization is a transformation which eliminates higher order functions and replaces them with a single order apply function [source](https://en.wikipedia.org/wiki/Defunctionalization). It turns out that by doing this, we can obtain stack safety. And since our functions are already in CPS, it is trivial. We just need to explicitly state our continuations, and then have a small step `eval` function that can evaluate these continuations. Here is an example, because reading that paragraph I just wrote I would be totally lost.

```purescript
-- making the continuation explicit
foldrCPS'' :: ∀ a b. (a -> b -> b) -> b -> List a -> b
foldrCPS'' fn acc lst = go lst identity
  where
  go Nil k = k acc
  go (Cons x xs) k = go xs (goCont x k)

  goCont currentValue kont = \res ->
    kont (fn currentValue res)
```

```purescript
-- encode both the goCont and the identity function as data
data FoldAccum a b
  = FoldCont a (FoldAccum a b)
  | FAContIdentity

foldrCPS :: ∀ a b. (a -> b -> b) -> b -> List a -> b
foldrCPS fn acc lst = go lst FAContIdentity
  where
  go Nil k = eval k acc
  go (Cons x xs) k = go xs (FoldCont x k)

  -- small step evaluation
  eval cont acc' = case cont of
    FoldCont a next -> do
      let result = fn a acc'
      eval next result
    FAContIdentity ->
      acc'
```

Now you can run this. And boom! It works and doesn't blow up the stack. Isn't that amazing? I promised in the beginning that I would show you how to do stack-safe operations over trees (or computations shaped as trees). Lets show how to do this same transformation over `fib`, or the naive implementation of computing the fibonacci number at some index `n`.

```purescript
-- naive implementation
fib :: Int -> Maybe Int
fib 0 = Just 0
fib 1 = Just 1
fib n = fib (n - 1) + fib (n - 2)
```

```purescript
-- CPS fib
fib :: Int -> Maybe Int
fib n = fib' identity
  where
  fib' k 0 = k $ Just 0
  fib' k 1 = k $ Just 1
  fib' k n
   | n < 0 = k Nothing
   | otherwise =
      fib'
        (\a -> 
          fib'
            (\b ->
              k $ (+) <$> a <*> b
            ) (n - 1)
        ) (n - 2)
```

```purescript
-- CPS fib - explicit continuations
fib :: Int -> Maybe Int
fib = fib' identity
  where
  fib' k 0 = k $ Just 0
  fib' k 1 = k $ Just 1
  fib' k n
   | n < 0 = k Nothing
   | otherwise = fib' (contFibOne n k) (n - 2)
    
  contFibOne n cont = \a -> do
    fib' (contFibTwo a cont) (n - 1)

  contFibTwo a cont = \b ->
    cont ((+) <$> a <*> b)
```

```purescript
data FibKont
  = ContFibOne Int FibKont
  | ContFibTwo (Maybe Int) FibKont
  | FibIdentity

-- CPS fib - defunctionalization
fib :: Int -> Maybe Int
fib = fib' FibIdentity
  where
  fib' k 0 = eval k (Just 0)
  fib' k 1 = eval k (Just 1)
  fib' k n
   | n < 0 = eval k Nothing
   | otherwise = fib' (ContFibOne n k) (n - 2)

  eval :: FibKont -> Maybe Int -> Maybe Int
  eval cont acc = case cont of
    ContFibOne n next ->
      fib' (ContFibTwo acc next) (n - 1)
    ContFibTwo x next ->
      eval next ((+) <$> x <*> acc)
    FibIdentity -> acc
```

```purescript
-- now we need to turn mutually recursive fib', eval cals into a data type.

data FibKont
  = ContFibOne Int FibKont
  | ContFibTwo (Maybe Int) FibKont
  | FibIdentity

fib :: Int -> Maybe Int
fib x = go (FibFib' FibIdentity x)
  where
  go call = case call of
    FibFib' cont 0 -> go (FibEval cont (Just 0))
    FibFib' cont 1 -> go (FibEval cont (Just 1))
    FibFib' cont n | n < 0 -> go (FibEval cont Nothing)
    FibFib' cont n -> go (FibFib' (ContFibOne n cont) (n - 2))
    FibEval cont acc -> case cont of
        ContFibOne n next ->
          go (FibFib' (ContFibTwo acc next) (n - 1))
        ContFibTwo a next ->
          go (FibEval next ((+) <$> a <*> acc))
        FibIdentity -> acc

data FibCall
  = FibEval FibKont (Maybe Int)
  | FibFib' FibKont Int
```
