const AWS = require('aws-sdk');
var uuid = require('node-uuid');
const fs = require('fs');
var path = require('path');
var moment = require('moment');


AWS.config.update({
    accessKeyId: "********************",
    secretAccessKey: "***********************",
    region: "********************",
});

var docClient = new AWS.DynamoDB.DocumentClient();
var s3 = new AWS.S3();

var table = "usuarios";

module.exports = {
    show: function(req, res) {
        var params = {
            TableName: table,
            ProjectionExpression: "usuarioid, nombre, apellidos, email, nacimiento, foto"
        };
        docClient.scan(params, function(err, items) {
            if (err) {
                console.error(err);
            } else {
                res.render('index', { items: items, moment: moment });
            }
        });
    },

    form: function(req, res) {
        let val_id = req.params.id;

        var params = {
            TableName: table,
            Key: { "usuarioid": val_id }
        };

        docClient.get(params, function(err, item) {
            console.log(item)
            if (err) {
                console.error(err);
                res.send(500);
            } else {
                res.render('actualizar', { usuario: item.Item, moment: moment });
            }
        });
    },
    add: function(req, res) {
        res.render('crear', { title: 'Express' });
    },
    create: function(req, res) {
        let fotoname = Date.now() + "_" + path.basename(req.files.archivo.name);
        var params = {
            Bucket: 'efernandez.com.pe',
            Body: fs.createReadStream(req.files.archivo.path),
            Key: fotoname
        };

        s3.upload(params, function(err, data) {
            if (err) {
                console.log("Error", err);
                res.send(500);
            }
            if (data) {
                var entrada = {
                    "usuarioid": uuid.v1({ node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab] }).toString(),
                    "nombre": req.fields.nombres,
                    "apellidos": req.fields.apellidos,
                    "email": req.fields.email,
                    "nacimiento": req.fields.nacimiento,
                    "foto": fotoname
                }
                var paramsDynamo = {
                    TableName: table,
                    Item: entrada
                };
                docClient.put(paramsDynamo, function(err, data) {
                    if (err) {
                        console.error(err);
                        res.send(500);
                    } else {
                        res.redirect('./');
                    }
                });
            }
        });
    },
    update: function(req, res) {
        var paramsOne = {
            TableName: table,
            Key: { "usuarioid": req.fields.id }
        };

        docClient.get(paramsOne, function(err, item) {
            console.log(item)
            if (err) {
                console.error(err);
                res.send(500);
            } else {
                let usuario = item.Item;
                if (req.files.archivo.name.length > 3) {
                    var paramsBucket = {
                        Bucket: "efernandez.com.pe",
                        Key: usuario.foto
                    };

                    s3.deleteObject(paramsBucket, function(err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        } else {
                            let fotoname = Date.now() + "_" + path.basename(req.files.archivo.name);
                            var paramsBucket1 = {
                                Bucket: 'efernandez.com.pe',
                                Body: fs.createReadStream(req.files.archivo.path),
                                Key: fotoname
                            };
                            s3.upload(paramsBucket1, function(err, data) {
                                if (err) {
                                    console.log("Error", err);
                                    res.redirect('./');
                                }
                                if (data) {
                                    var paramsUpdate = {
                                        TableName: table,
                                        Key: {
                                            "usuarioid": req.fields.id
                                        },
                                        UpdateExpression: "set nombre = :nombre, nacimiento = :nacimiento , apellidos = :apellidos , foto = :foto, email = :email",
                                        ExpressionAttributeValues: {
                                            ":nombre": req.fields.nombres,
                                            ":apellidos": req.fields.apellidos,
                                            ":email": req.fields.email,
                                            ":nacimiento": req.fields.nacimiento,
                                            ":foto": fotoname,
                                        },
                                        ReturnValues: "UPDATED_NEW"
                                    };
                                    docClient.update(paramsUpdate, function(err, data) {
                                        if (err) {
                                            console.error(err);
                                        } else {
                                            console.log("Registro Insertado correctamente");
                                            res.redirect('./');
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.log("Actualizar sin foto")
                    var paramsUpdate = {
                        TableName: table,
                        Key: {
                            "usuarioid": req.fields.id
                        },
                        UpdateExpression: "set nombre = :nombre,apellidos = :apellidos,  email = :email, nacimiento = :nacimiento ",
                        ExpressionAttributeValues: {
                            ":nombre": req.fields.nombres,
                            ":apellidos": req.fields.apellidos,
                            ":email": req.fields.email,
                            ":nacimiento": req.fields.nacimiento
                        },
                        ReturnValues: "UPDATED_NEW"
                    };
                    docClient.update(paramsUpdate, function(err, data) {
                        if (err) {
                            console.error(err);
                        } else {
                            res.redirect('./');
                        }
                    });
                }
            }
        });
    },
    delete: function(req, res) {

        var params = {
            TableName: table,
            Key: { "usuarioid": req.fields.id }
        };

        docClient.get(params, function(err, item) {
            let usuario = item.Item;
            if (err) {
                console.error(err);
                res.send(500);
            } else {
                var params = {
                    Bucket: "efernandez.com.pe",
                    Key: usuario.foto
                };
                s3.deleteObject(params, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        var entrada = {
                            "usuarioid": req.fields.id,
                        }
                        var params = {
                            TableName: table,
                            Key: entrada
                        };

                        docClient.delete(params, function(err, data) {
                            if (err) {
                                console.error(err);
                            } else {
                                res.redirect('./');
                            }
                        });

                    }
                });
            }
        });

    },
}