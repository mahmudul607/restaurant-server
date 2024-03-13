const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
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
// all get operations here--------------------------------------------------------------------------------------------------
    app.get("/menu", async (req, res) => {
        const result = await menuCollections.find().toArray();
        res.send(result);
    })
   
    app.get('/menu/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = {'category' : id};
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
      const query = {'category' : id};
      const result = await menuCollections.find(query).toArray();
      res.send(result);

    })
    app.get("/carts", async (req, res) => {
      const email= req.query.email;
      const query = {email : email};
      const result = await cartsCollections.find(query).toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollections.find().toArray();
      res.send(result);
    })
// all post operation in here ----------------------------------------------------------------------------------------------
    app.post('/carts', async (req,res)=>{
      const itemId = req.body;
      const result = await cartsCollections.insertOne(itemId);
      res.send(result);
    })

    app.post('/users', async (req,res)=>{
      const user = req.body;
      const query = {email: user.email};

      const existingUser = await usersCollections.findOne(query);
      if(existingUser) {
        return res.send({message: "User already exists", insertId: null})
      }
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

    // All delete operations api is here ------------------------------------------------------------------------------------
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id) };
      const result = await cartsCollections.deleteOne(query);
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

app.get('/', (req, res) =>{
    res.send('Boss is setting');
});

app.listen(port, () =>{
    console.log(`Bistro boss is setting on port ${port}`);
})