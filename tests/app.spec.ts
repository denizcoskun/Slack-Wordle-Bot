import request from "supertest";
import { Express } from "express-serve-static-core";
import app, { characterDiff, GAMES, GAME_ID, MatchStatus } from "../src/app";
import { WordleGame } from "../src/game";

let server: Express;

describe('Wordle Slack Bot"', () => {
  beforeAll(() => {
    server = app;
  });

  it("should return 200", (done) => {
    request(server)
      .get("/")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.text).toEqual("<h1>Hello World!</h1>");
        done();
      });
  });
  describe("/wordle/guess/", () => {
    beforeEach(() => {
      const gameId: GAME_ID = `${new Date().toLocaleDateString(
        "en-GB"
      )}-public`;
      GAMES[gameId] = new WordleGame("novel", { "another-player": ["weird"] });
    });
    it("should notify the user when they've run out of guesses", (done) => {
      ["HELLO", "Hello", "MELLO", "WORLD"].forEach((guess) => {
        request(server)
          .post("/wordle/guess")
          .send({ text: guess, user_name: "csk" })
          .end(() => done());
      });

      request(server)
        .post("/wordle/guess")
        .send({ text: "DOUGH", user_name: "csk" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text).toEqual(
            "Sorry, you have run out of guesses for today."
          );
          done();
        });

      request(server)
        .post("/wordle/guess")
        .send({ text: "DOUGH", user_name: "another-user-1" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text).not.toEqual(
            "Sorry, you have run out of guesses for today."
          );
          done();
        });
    });
    it("should notify the user when the guess is incorrect", (done) => {
      request(server)
        .post("/wordle/guess")
        .send({ text: "HELLO", user_name: "csk" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(JSON.parse(res.text)).toEqual({
            type: "mrkdwn",
            text: "Your guesses: \n>:white_circle:‎:large_orange_circle:‎:large_orange_circle:‎:white_circle:‎:large_orange_circle: - h‎E‎L‎l‎O",
          });
          done();
        });
    });
    it("should notify the user when the guess is correct", (done) => {
      request(server)
        .post("/wordle/guess")
        .send({ text: "novel", user_name: "csk" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(JSON.parse(res.text)).toEqual({
            response_type: "in_channel",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "The winner is <@csk> with *NOVEL*! :tada: \n>:large_green_circle:‎:large_green_circle:‎:large_green_circle:‎:large_green_circle:‎:large_green_circle:",
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "Today's players (2): <@another-player> <@csk>",
                },
              },
            ],
          });
          done();
        });
    });
    it("should notify other users when there is a winner", (done) => {
      request(server)
        .post("/wordle/guess")
        .send({ text: "novel", user_name: "csk" })
        .expect(200)
        .end(() => {});

      request(server)
        .post("/wordle/guess")
        .send({ text: "novel", user_name: "vagabond" })
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text.includes("the winner is <@csk>")).toBeTruthy();
          done();
        });
    });
  });
});

describe("guessDiff", () => {
  it("should return correct diff", () => {
    const game = new WordleGame("reada");
    const actual = characterDiff("AAAAB", game.CHARACTER_MAP);
    expect(actual).toEqual([
      ["A", MatchStatus.partial],
      ["A", MatchStatus.none],
      ["A", MatchStatus.full],
      ["A", MatchStatus.none],
      ["B", MatchStatus.none],
    ]);
  });
  it("should return correct diff", () => {
    const game = new WordleGame("READY");
    const actual = characterDiff("DRAMA", game.CHARACTER_MAP);
    expect(actual).toEqual([
      ["D", MatchStatus.partial],
      ["R", MatchStatus.partial],
      ["A", MatchStatus.full],
      ["M", MatchStatus.none],
      ["A", MatchStatus.none],
    ]);
  });
  it("should return correct diff", () => {
    const game = new WordleGame("HELLO");
    const actual = characterDiff("HLOLO", game.CHARACTER_MAP);
    expect(actual).toEqual([
      ["H", MatchStatus.full],
      ["L", MatchStatus.partial],
      ["O", MatchStatus.none],
      ["L", MatchStatus.full],
      ["O", MatchStatus.full],
    ]);
  });
});
