import express from "express";
import {
  InvalidGuess,
  MaxAttemptReached,
  WordleGame,
  GameFinished,
} from "./game";
import { WORD_POOL } from "./words";
const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type DATE = string;
type CHANNEL_ID = string;
export type GAME_ID = `${DATE}-${CHANNEL_ID}`;
export const GAMES: { [id: GAME_ID]: WordleGame } = {};

app.get("/", (req, res) => {
  return res.send("<h1>Hello World!</h1>");
});
app.post("/wordle/guess/", async (req, res) => {
  const guess: string = req.body?.text?.trim().toUpperCase();
  const userName = req.body.user_name;
  const channelId: string = "public"; // req.body.channel_id;
  const today = new Date();
  const date = today.toLocaleDateString("en-GB");
  let game = GAMES[`${date}-${channelId}`];
  const gameId: GAME_ID = `${date}-${channelId}`;
  if (
    today.getHours() < 9 ||
    (today.getHours() === 9 && today.getMinutes() < 30)
  ) {
    return res.send("The game starts at 9:30AM :sunrise: :bird:");
  }
  if (!game) {
    const randomIdx = Math.round(Math.random() * (WORD_POOL.length - 1));
    const word = WORD_POOL[randomIdx];
    console.log(word);
    game = new WordleGame(word);
    GAMES[gameId] = game;
  }

  try {
    const [isCorrect, attempts, isFinalAttempt] = await game.makeAGuess(
      userName,
      guess
    );
    const payload = slackResponseBody(
      userName,
      isCorrect,
      attempts,
      game.CHARACTER_MAP,
      isFinalAttempt,
      game.word,
      game.players
    );
    return res.send(payload);
  } catch (error) {
    if (error instanceof InvalidGuess) {
      return res.send(`Invalid guess: ${guess}`);
    } else if (error instanceof MaxAttemptReached) {
      return res.send(`Sorry, you have run out of guesses for today.`);
    } else if (error instanceof GameFinished) {
      return res.send(
        game.winner
          ? `The game is finished, the winner is <@${userName}>\n>Answer: ${game.word}`
          : `The game is finished.\n>Answer: ${game.word}`
      );
    }
    return res.send("Something went wrong, please contact <@devs>");
  }
});

export default app;

function slackResponseBody(
  userName: string,
  isCorrect: boolean,
  attempts: string[],
  characters: { [character: string]: number[] },
  isFinalAttempt: boolean,
  word: string,
  players: string[]
) {
  const successMessage = `${attempts
    .map((attempt) => formattedDiff(attempt, characters, true))
    .join("\n>")}`;

  const attemptsFormatted = `${attempts
    .map(
      (attempt) =>
        `${formattedDiff(attempt, characters, true)} - ${formattedDiff(
          attempt,
          characters,
          false
        )}`
    )
    .join("\n>")}`;

  return isCorrect
    ? {
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `The winner is <@${userName}> with *${word}*! :tada: \n>${successMessage}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `Today's players (${players.length}): ` +
                players.map((p) => `<@${p}>`).join(" "),
            },
          },
        ],
      }
    : isFinalAttempt
    ? {
        type: "mrkdwn",
        text: `Sorry, you have run out of guesses. The answer is *${word}*: \n>${attemptsFormatted}`,
      }
    : {
        type: "mrkdwn",
        text: `Your guesses: \n>${attemptsFormatted}`,
      };
}

function formattedDiff(
  word: string,
  characters: { [c: string]: number[] },
  abstract = false
) {
  const diff = [];
  for (let index = 0; index < word.length; index++) {
    const character = word[index];
    if (!characters[character]?.length) {
      diff.push(abstract ? ":white_circle:" : `${character.toLowerCase()}`);
    } else if (characters[character].includes(index)) {
      diff.push(abstract ? ":large_green_circle:" : `*${character}*`);
    } else {
      diff.push(abstract ? ":large_orange_circle:" : character);
    }
  }
  return diff.join("‎");
}
