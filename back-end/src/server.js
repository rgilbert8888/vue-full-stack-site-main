import express from "express";
import { MongoClient } from "mongodb";
import path from "path";
// import { cartItems, products } from "./temp-data";
// import {
//   cartItems as cartItemsRaw,
//   products as productsRaw,
// } from "./temp-data";

// convert to local vars that we can modify
// let cartItems = cartItemsRaw;
// let products = productsRaw;

async function start() {
  const mongoUrl = `mongodb+srv://robyngilb:QMvjKfhOUVoYD7hE@cluster0.knynacd.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(mongoUrl);

  await client.connect();
  const db = client.db("fsv-db");

  const app = express();
  app.use(express.json());

  app.use("/images", express.static(path.join(__dirname, "../assets")));

  // for front end serving...
  app.use(
    express.static(path.resolve(__dirname, "../dist"), {
      maxAge: "1y",
      etag: false,
    })
  );

  // -- Load Data Endpoints -- //

  // GET ALL PRODUCTS
  app.get("/api/products", async (req, res) => {
    const products = await db.collection("products").find({}).toArray();
    res.send(products);
  });

  // helper function to map cart item ids to product ids
  async function populateCartIds(ids) {
    return Promise.all(
      ids.map((id) => db.collection("products").findOne({ id }))
    );
    // return ids.map((id) => products.find((product) => product.id === id));
  }

  // GET ALL PRODUCTS IN USER CART
  app.get("/api/users/:userId/cart", async (req, res) => {
    const user = await db
      .collection("users")
      .findOne({ id: req.params.userId });
    const populatedCart = await populateCartIds(user?.cartItems || []);
    res.json(populatedCart);
  });

  // GET SINGLE PRODUCT
  app.get("/api/products/:productId", async (req, res) => {
    // const productId = req.params.productId;
    // const product = products.find((product) => product.id === productId);
    const productId = req.params.productId;
    const product = await db.collection("products").findOne({ id: productId });
    res.json(product);
  });

  // -- CRUD Data Endpoints -- //

  app.post("/api/users/:userId/cart", async (req, res) => {
    const userId = req.params.userId;
    const productId = req.body.id;

    // Find user in users collection
    const existingUser = await db.collection("users").findOne({ id: userId });

    // if not existing user, create new user and new empty cart
    if (!existingUser) {
      await db.collection("users").insertOne({ id: userId, cartItems: [] });
    }

    await db.collection("users").updateOne(
      { id: userId },
      {
        $addToSet: { cartItems: productId }, // add product ID onto array called cartItems
      }
    );
    // send back updated cart list in response
    const user = await db
      .collection("users")
      .findOne({ id: req.params.userId });
    const populatedCart = await populateCartIds(user?.cartItems || []);
    res.json(populatedCart);
  });

  app.delete("/api/users/:userId/cart/:productId", async (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;
    await db.collection("users").updateOne(
      { id: userId },
      {
        $pull: { cartItems: productId }, // add product ID onto array called cartItems
      }
    );
    // send back updated cart list in response
    const user = await db
      .collection("users")
      .findOne({ id: req.params.userId });
    const populatedCart = await populateCartIds(user?.cartItems || []);
    res.json(populatedCart);
  });

  // Send index.html back for any request not handled above
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });

  // Allow hosting platform to change port - 8000 as backup
  const port = process.env.PORT || 8000;

  // Listen
  app.listen(port, () => {
    console.log("server is listening on port 8000");
  });

  // To start up server, run:
  // $ npx babel-node src/server.js

  // To start up server with NODEMON, run:
  // $ npx nodemon --exec npx babel-node src/server.js

  // To start up with shortcut script defined in package.json, run:
  // $ npm run [ name of script ]
  // $ npm run dev
}

start();
