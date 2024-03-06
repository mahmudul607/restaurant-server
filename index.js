const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
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