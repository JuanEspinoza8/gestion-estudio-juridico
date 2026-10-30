// Variables de entorno para los tests: nunca se conectan a una base real
// (los tests mockean src/config/db y el storage).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-solo-para-tests';
