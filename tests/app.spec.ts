import request from "supertest";
import { Express } from "express-serve-static-core";
import app, { GAMES, GAME_ID } from "../src/app";
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
            text: "Your guesses: \n>:white_circle:‎:large_orange_circle:‎:large_orange_circle:‎:large_orange_circle:‎:large_orange_circle: - h‎E‎L‎L‎O",
          });
          done();
        });
    });
    it("should notify the user when the guess is incorrect", (done) => {
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
  });
});
