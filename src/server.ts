import app from "./app";

const server = app.listen(3000, () => {
  console.log(`This is running on port 3000`);
});

export default server;
