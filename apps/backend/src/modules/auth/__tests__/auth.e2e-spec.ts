import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';


// Bootstrap de l'application : 
describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });


//   Test 1 : la methode register 
    it('POST /auth/register → 201', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).not.toHaveProperty('password');
  });


  //   Test 2 : la methode login 
    it('POST /auth/login → 200 + JWT', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({
        email: 'testuser@test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');

    accessToken = res.body.accessToken;
  });


    //   Test 3 : Accès au route protégée sans Token

    it('GET /auth/me → 401 sans token', async () => {
    const res = await request(server).get('/auth/me');
    expect(res.status).toBe(401);
  });


      //   Test 4 : Accès au route protégée avec Token

    it('GET /auth/me → 200 avec token', async () => {
    const res = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'testuser@test.com');
  });
});
