import axios from "axios";

export class InvalidGuess extends Error {}
export class MaxAttemptReached extends Error {}
export class GameFinished extends Error {}

export class WordleGame {
  readonly CHARACTER_MAP: { [character: string]: number[] } = {};
  private finished = false;
  private _winner?: string;
  constructor(
    public readonly word: string,
    public readonly guesses: { [userId: string]: string[] } = {},
    public readonly MAX_NO_GUESSES: number = 3
  ) {
    this.word = word.toUpperCase();
    for (let index = 0; index < word.length; index++) {
      this.CHARACTER_MAP[this.word[index]] = [
        ...(this.CHARACTER_MAP[this.word[index]] || []),
        index,
      ];
    }
  }

  get winner() {
    return this._winner;
  }

  get players() {
    return Object.keys(this.guesses);
  }

  async makeAGuess(
    username: string,
    guess_word: string | undefined
  ): Promise<
    [isCorrect: boolean, attempts: string[], isFinalAttempts: boolean]
  > {
    if (this.finished) {
      throw new GameFinished();
    }
    if (!this.guesses[username]) {
      this.guesses[username] = [];
    }
    if (this.guesses[username].length >= this.MAX_NO_GUESSES) {
      throw new MaxAttemptReached();
    }
    const isCorrect = guess_word?.toUpperCase() === this.word;
    if (isCorrect) {
      this._winner = username;
      this.finish();
    }
    if (
      !guess_word ||
      guess_word.length !== this.word.length
      // TODO: Check if the guess is a valid word
      // || !(await this.validateWord(guess_word)) the dictionary api is down!
    ) {
      throw new InvalidGuess();
    }
    if (
      !this.guesses[username].find(
        (guess) => guess.toUpperCase() === guess_word.toUpperCase()
      )
    ) {
      this.guesses[username].push(guess_word);
    }
    const isFinalAttempt =
      this.guesses[username].length === this.MAX_NO_GUESSES;
    return [isCorrect, this.guesses[username], isFinalAttempt];
  }
  finish() {
    this.finished = true;
  }

  async validateWord(word: string) {
    let isValid = false;
    try {
      const validateWordResponse = await axios(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (validateWordResponse.status === 200) {
        isValid = true;
      }
    } catch (error) {
      isValid = false;
    }

    return isValid;
  }
}
