import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';
import cors from 'cors';
import { format } from 'util';

const app = express();


app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());
app.use(cors());

const withDB = async (operations, res) => {
    try {
        const client = await MongoClient.connect("mongodb+srv://mongoDBAdmin:3asyGraph2020@cluster0.dri3r.mongodb.net/<dbname>?retryWrites=true&w=majority", { useUnifiedTopology: true })
        const db = client.db('easy_graph');

        await operations(db);

        client.close();
        
    } catch {
        res.status(500).json({ message: 'Error connecting to db', error });
    }
}

//Make sure that tags in JSON match with the api call in the client side.
app.post('/api/saveGraph', (req, res) => {
    const { userToken, graphOptions } = req.body;
    //console.log(userToken);
    //console.log(graphOptions);

    //console.log("received api call");

    withDB(async (db) => {

        const graphInfo = await db.collection('EasyGraph').findOne({ userToken: userToken });
        if (graphInfo !== null) {
            
            const p = await db.collection('EasyGraph').updateOne({ userToken: userToken }, {
                '$set': {
                    graphOptions: graphInfo.graphOptions.concat(graphOptions),
                },
            });
            console.log("Finished insertion");
        } else {
            console.log("new entry");
            
            const p = await db.collection('EasyGraph').insertOne({
                userToken: userToken,
                graphOptions: [graphOptions]
            });
        }
        
        res.status(200).json(req.body);
    }, res);
});

app.post('/api/validateGraph', (req, res) => {
    const { userToken, title } = req.body;
    var valid = true;
    
    withDB(async (db) => {        
        
        const temp = await db.collection('EasyGraph').findOne({
            'graphOptions.title': { text: title }
        })
        
        if (temp !== null) {
            valid = false;
        }      

        res.status(200).send(valid);
    }, res);
})

app.post('/api/viewSavedGraphs', async (req, res) => {
    const { userToken } = req.body;
    withDB(async (db) => {        
        const savedGraphs = await db.collection('EasyGraph').findOne({ userToken: userToken });      
        var formattedGraphs = null;
        console.log("right before if block");
        if (savedGraphs !== null) {
            formattedGraphs = savedGraphs.graphOptions;
            console.log("right after assignment");
        }
        console.log(formattedGraphs);
        res.status(200).json(formattedGraphs);
    }, res);
});


app.post('/api/deleteSavedGraph', async (req, res) => {
    const { userToken, title } = req.body;
    withDB(async (db) => {

        const graph = await db.collection('EasyGraph').findOne({ userToken: userToken });

        if (graph !== null) {
            console.log("Inside update block");
            await db.collection('EasyGraph').findOneAndUpdate({ userToken: userToken }, {
                '$pull': { "graphOptions": { title: { text: title } } } },
                false,
                true
            );
            console.log("Outside update block");

            const updatedgraph = await db.collection('EasyGraph').findOne({ userToken: userToken });

            res.status(200).json(updatedgraph);
        } else {
            console.log("ERROR");
        }
    }, res);
});

app.post('/api/saveComment', async (req, res) => {
    const { newComment } = req.body;
    withDB(async (db) => {

        var obj = await db.collection('EasyGraph').findOne({ name: "commentsObject" });

        const p = await db.collection('EasyGraph').updateOne({ name: "commentsObject" }, {
            '$set': {
                data: obj.data.concat(newComment),
            },
        });
        obj = await db.collection('EasyGraph').findOne({ name: "commentsObject" });
        res.status(200).json(obj);
    }, res)    
});

app.get('/api/getComments', async (req, res) => { 
    withDB(async (db) => {
        const obj = await db.collection('EasyGraph').findOne({ name: "commentsObject" });
        //console.log(obj);
        res.status(200).json(obj);        
    }, res);       
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));
