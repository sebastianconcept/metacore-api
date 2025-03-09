# metacore-api


## Deploys

### Postgress and Kafka

```
npm run deploy:infra
```

### All services in staging

```
npm run deploy:all -- -e staging
```

### All services in staging of those that changed since the last commit

```
npm run deploy:changes -- -e staging
```

### Start all in a specific tag

```
npm run deploy:all -- -e staging -t v1.0.3
```

