const request = require('supertest');
const express = require('express');
const {{name}}Routes = require('../routes/{{name}}Routes');

const app = express();
app.use(express.json());
app.use('/{{name}}s', {{name}}Routes);

describe('{{name}} API', () => {
  
  describe('GET /{{name}}s', () => {
    it('should return empty array initially', async () => {
      const res = await request(app)
        .get('/{{name}}s')
        .expect(200);
      
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /{{name}}s', () => {
    it('should create a new {{name}}', async () => {
      const new{{name}} = {{testData}};
      
      const res = await request(app)
        .post('/{{name}}s')
        .send(new{{name}})
        .expect(201);
      
      expect(res.body).toMatchObject(new{{name}});
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/{{name}}s')
        .send({})
        .expect(400);
      
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /{{name}}s/:id', () => {
    it('should return {{name}} by ID', async () => {
      // First create a {{name}}
      const new{{name}} = {{testData}};
      const createRes = await request(app)
        .post('/{{name}}s')
        .send(new{{name}})
        .expect(201);
      
      const res = await request(app)
        .get(`/{{name}}s/${createRes.body.id}`)
        .expect(200);
      
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should return 404 for non-existent {{name}}', async () => {
      await request(app)
        .get('/{{name}}s/999')
        .expect(404);
    });
  });

  describe('PUT /{{name}}s/:id', () => {
    it('should update {{name}}', async () => {
      // First create a {{name}}
      const new{{name}} = {{testData}};
      const createRes = await request(app)
        .post('/{{name}}s')
        .send(new{{name}})
        .expect(201);
      
      const updates = {{updateData}};
      
      const res = await request(app)
        .put(`/{{name}}s/${createRes.body.id}`)
        .send(updates)
        .expect(200);
      
      expect(res.body).toMatchObject(updates);
      expect(res.body.updatedAt).toBeDefined();
    });
  });

  describe('DELETE /{{name}}s/:id', () => {
    it('should delete {{name}}', async () => {
      // First create a {{name}}
      const new{{name}} = {{testData}};
      const createRes = await request(app)
        .post('/{{name}}s')
        .send(new{{name}})
        .expect(201);
      
      await request(app)
        .delete(`/{{name}}s/${createRes.body.id}`)
        .expect(204);
      
      // Verify it's deleted
      await request(app)
        .get(`/{{name}}s/${createRes.body.id}`)
        .expect(404);
    });
  });
});