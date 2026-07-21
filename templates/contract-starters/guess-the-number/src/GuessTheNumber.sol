// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GuessTheNumber {
    uint256 private secretNumber;
    bool public solved;

    event Guess(address indexed player, uint256 guess, bool correct);
    event NewSecretNumber(uint256 secretNumber);

    constructor(uint256 _secretNumber) {
        secretNumber = _secretNumber;
        solved = false;
        emit NewSecretNumber(_secretNumber);
    }

    function guess(uint256 _guess) public returns (bool) {
        require(!solved, "Already solved");
        bool correct = _guess == secretNumber;
        if (correct) {
            solved = true;
        }
        emit Guess(msg.sender, _guess, correct);
        return correct;
    }

    function setSecretNumber(uint256 _newSecretNumber) public {
        require(solved, "Current puzzle not solved yet");
        secretNumber = _newSecretNumber;
        solved = false;
        emit NewSecretNumber(_newSecretNumber);
    }
}
