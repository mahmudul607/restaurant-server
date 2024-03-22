const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.c8drypi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollections = client.db("restaurantDB").collection("menu");
    const reviewsCollections = client.db("restaurantDB").collection("reviews");
    const cartsCollections = client.db("restaurantDB").collection("carts");
    const usersCollections = client.db("restaurantDB").collection("users");
    const paymentsCollections = client.db("restaurantDB").collection("payments");

    // middlewares

    // verify token
    const verifyToken = (req, res, next) => {

      console.log("Inside Verify token:", req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" })
      }
      const token = req.headers.authorization.split(" ")[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        console.log('decoded:', decoded);
        next();
      })



    }
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Unauthorized Access' });


      }
      next();
    }
    // payment api here ========================================================================================================

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      },
      {
        apiKey:process.env.STRIPE_SECRET_KEY
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    });

    app.post('/payments', async (req, res)=>{
      const payment = req.body;
      const paymentResult = await paymentsCollections.insertOne(payment);

      const query = {_id:{
        $in: payment.cartIds.map(id => new ObjectId(id))
      }};
      const deleteResult = await cartsCollections.deleteMany(query);
      res.send({paymentResult, deleteResult});
    })
    // JWT Authorization -----------------------------------------------------------------------------------------------------

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    }) 


    // all get operations here--------------------------------------------------------------------------------------------------
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (!email === req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });

      }
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin });
    })
    app.get("/menu", async (req, res) => {
      const result = await menuCollections.find().toArray();
      res.send(result);
    })
// booking loading in admin route secure api

app.get("/bookings", verifyToken, verifyAdmin, async (req, res) => {
  const result = await paymentsCollections.find().toArray();
  res.send(result);
});

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const firstQuery = { _id: id };
      const secondQuery = { _id: new ObjectId(id) };
      const result = await menuCollections.findOne({ $or: [firstQuery, secondQuery] });
      res.send(result);
    })




    app.get('/menu/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = { 'category': id };
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await menuCollections.find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/menu/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { 'category': id };
      const result = await menuCollections.find(query).toArray();
      res.send(result);

    })
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollections.find(query).toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollections.find().toArray();
      res.send(result);
    })

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollections.find().toArray();
      res.send(result);
    })



    // all post operation in here ----------------------------------------------------------------------------------------------
    app.post('/carts', async (req, res) => {
      const itemId = req.body;
      const result = await cartsCollections.insertOne(itemId);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };

      const existingUser = await usersCollections.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertId: null })
      }
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollections.insertOne(menuItem);
      res.send(result);
    })
    // All delete operations api is here ------------------------------------------------------------------------------------
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollections.deleteOne(query);
      res.send(result);
    })

    app.delete("/users/:id", async (req, res) => {
      const user = req.params.id;
      const query = { _id: new ObjectId(user) };
      const result = await usersCollections.deleteOne(query);
      res.send(result);
    })
    app.delete("/menu/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const firstQuery = { _id: new ObjectId(id) };
      const secondQuery = { _id: id }
      const result = await menuCollections.deleteOne({ $or: [firstQuery, secondQuery] });
      res.send(result);

    })
    // patch on the mongodb database

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollections.updateOne(query, updatedDoc);
      res.send(result);
    })
    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const firstQuery = { _id: id };
      const secondQuery = { _id: new ObjectId(id) };
      const updateInfo = req.body;
      let updatedDoc;
      if (updateInfo.image) {
        updatedDoc = {
          $set: {
            name: updateInfo.name,
            recipe: updateInfo.recipe,
            price: updateInfo.price,
            category: updateInfo.category,
            image: updateInfo.image
          }
        }
      }
      else {
        updatedDoc = {
          $set: {
            name: updateInfo.name,
            recipe: updateInfo.recipe,
            price: updateInfo.price,
            category: updateInfo.category,

          }
        }

      }
      const result = await menuCollections.updateOne({ $or: [firstQuery, secondQuery] }, updatedDoc);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Boss is setting');
});

app.listen(port, () => {
  console.log(`Bistro boss is setting on port ${port}`);
})