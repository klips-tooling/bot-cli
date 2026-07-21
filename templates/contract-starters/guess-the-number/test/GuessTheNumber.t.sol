// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GuessTheNumber.sol";

contract GuessTheNumberTest is Test {
    GuessTheNumber public game;

    function setUp() public {
        game = new GuessTheNumber(42);
    }

    function test_CorrectGuess() public {
        assertFalse(game.solved());
        bool correct = game.guess(42);
        assertTrue(correct);
        assertTrue(game.solved());
    }

    function test_WrongGuess() public {
        bool correct = game.guess(7);
        assertFalse(correct);
        assertFalse(game.solved());
    }

    function test_SetNewSecretNumber() public {
        game.guess(42);
        game.setSecretNumber(99);
        assertFalse(game.solved());
        bool correct = game.guess(99);
        assertTrue(correct);
    }
}
