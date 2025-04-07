const express = require('express');
const cors = require('cors');
const app = express();
const { createConnection } = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const lojaHardwareCONN = createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

//Consulta para produtos ativos
app.get('/', (req, res) => {
    lojaHardwareCONN.query('SELECT * FROM produtos_hardware WHERE ativo = 1', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// Consulta para usuários
app.get('/users', (req, res) => {
    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// Consulta para usuário filtrado pelo id
app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware WHERE id = ?', [id], (error, results) => {
        if (error) throw error;
        if (results[0]) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: 'Usuário não encontrado' });
        }
    });
});

// Atualizar um usuário
app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, nome, email, cpf, senha, rua, bairro, numero, cep, cidade, estado } = req.body;
    const queryUpdate = 'UPDATE usuarios_hardware SET usuario = ?, nome = ?, email = ?, cpf = ?, senha = ?, rua = ?, bairro = ?, numero = ?, cep = ?, cidade = ?, estado = ? WHERE id = ?';
    lojaHardwareCONN.query(queryUpdate, [usuario, nome, email, cpf, senha, rua, bairro, numero, cep, cidade, estado, id], (error, results) => {
        if (error) throw error;
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});

// Verificar se um nome de usuário já existe
app.post('/checkUser/:id', (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware WHERE usuario = ? AND id != ?', [usuario, id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'Nome de usuário já existe' });
        } else {
            res.json({ message: 'Nome de usuário disponível' });
        }
    });
});

// Verificar se um email já existe
app.post('/checkEmail/:id', (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware WHERE email = ? AND id != ?', [email, id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'E-mail já existe' });
        } else {
            res.json({ message: 'E-mail disponível' });
        }
    });
});

// Verificar se um CPF já existe
app.post('/checkCpf/:id', (req, res) => {
    const { id } = req.params;
    const { cpf } = req.body;
    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware WHERE cpf = ? AND id != ?', [cpf, id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'CPF já existe' });
        } else {
            res.json({ message: 'CPF disponível' });
        }
    });
});

// Verificar a senha do usuário
app.post('/checkPassword/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    lojaHardwareCONN.query('SELECT * FROM usuarios_hardware WHERE id = ?', [id], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const user = results[0];

            // Senha em texto simples (o que não é recomendado), feito assim:
            // if (user.senha === password) {
            //    res.json({ message: 'Senha correta' });
            // } else {
            //    res.status(401).json({ message: 'Senha incorreta' });
            // }

            // Senha usando bcrypt, é feito assim:
            bcrypt.compare(password, user.senha, function (err, result) {
                if (result === true) {
                    res.json({ message: 'Senha correta' });
                } else {
                    res.status(401).json({ message: 'Senha incorreta' });
                }
            });
        } else {
            res.status(404).json({ message: 'Usuário não encontrado' });
        }
    });
});

// Adicionar item ao carrinho
app.post('/cart', (req, res) => {
    const { id_usuario, id_produto, quantidade } = req.body;
    const queryCheck = 'SELECT * FROM carrinho_hardware WHERE id_usuario = ? AND id_produto = ?';
    const queryInsert = 'INSERT INTO carrinho_hardware (id_usuario, id_produto, quantidade) VALUES (?, ?, ?)';
    const queryUpdate = 'UPDATE carrinho_hardware SET quantidade = quantidade + ? WHERE id_usuario = ? AND id_produto = ?';

    lojaHardwareCONN.query(queryCheck, [id_usuario, id_produto], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            // Item já está no carrinho, atualizar quantidade
            lojaHardwareCONN.query(queryUpdate, [quantidade, id_usuario, id_produto], (error, results) => {
                if (error) throw error;
                res.json({ message: 'Quantidade atualizada no carrinho' });
            });
        } else {
            // Item não está no carrinho, inserir nova entrada
            lojaHardwareCONN.query(queryInsert, [id_usuario, id_produto, quantidade], (error, results) => {
                if (error) throw error;
                res.json({ message: 'Item adicionado ao carrinho' });
            });
        }
    });
});

// Remover específico item do carrinho
app.delete('/cart/:id', (req, res) => {
    const { id } = req.params;
    lojaHardwareCONN.query('DELETE FROM carrinho_hardware WHERE id = ?', [id], (error, results) => {
        if (error) throw error;
        res.json({ message: 'Item removido do carrinho' });
    });
});

// Obter todos os itens no carrinho de um usuário específico
app.get('/cart/:id_usuario', (req, res) => {
    const { id_usuario } = req.params;
    const query = `
        SELECT carrinho_hardware.*, produtos_hardware.nome, produtos_hardware.imagem_url, produtos_hardware.preco, produtos_hardware.descricao
        FROM carrinho_hardware
        JOIN produtos_hardware ON carrinho_hardware.id_produto = produtos_hardware.id
        WHERE carrinho_hardware.id_usuario = ?
    `;
    lojaHardwareCONN.query(query, [id_usuario], (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// Limpar todo carrinho do usuário em específico
app.delete('/cartUser/:id_usuario', (req, res) => {
    const { id_usuario } = req.params;
    lojaHardwareCONN.query('DELETE FROM carrinho_hardware WHERE id_usuario = ?', [id_usuario], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro ao remover itens do carrinho' });
            return;
        }
        res.json({ message: 'Todos os itens removidos do carrinho para o usuário' });
    });
});

// Inserir um novo produto
app.post('/addProduct', (req, res) => {
    const { ativo, nome, descricao, preco, imagem_url, marca, categoria, usuario_registro } = req.body;

    const queryCheck = 'SELECT * FROM produtos_hardware WHERE nome = ?';
    lojaHardwareCONN.query(queryCheck, [nome], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'O produto já está cadastrado.' });
            return;
        }

        const queryInsert = 'INSERT INTO produtos_hardware (ativo, nome, descricao, preco, imagem_url, marca, categoria, usuario_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        lojaHardwareCONN.query(queryInsert, [ativo, nome, descricao, preco, imagem_url, marca, categoria, usuario_registro], (error, results) => {
            if (error) throw error;
            res.json({ message: 'Produto inserido com sucesso' });
        });
    });
});

// Desativar um produto
app.put('/product/:id', (req, res) => {
    const { id } = req.params;
    const { ativo } = req.body;

    const queryUpdate = 'UPDATE produtos_hardware SET ativo = ? WHERE id = ?';
    lojaHardwareCONN.query(queryUpdate, [ativo, id], (error, results) => {
        if (error) throw error;
        res.json({ message: 'Produto atualizado com sucesso' });
    });
});

// Adicionar um novo usuário
app.post('/registerUser', (req, res) => {
    const { admin, ativo, usuario, nome, email, cpf, senha, rua, bairro, numero, cep, cidade, estado } = req.body;

    // Verificar se o usuário já existe
    const queryCheckUser = 'SELECT * FROM usuarios_hardware WHERE usuario = ?';
    lojaHardwareCONN.query(queryCheckUser, [usuario], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'O nome de usuário já existe.' });
            return;
        }

        // Verificar se o email já existe
        const queryCheckEmail = 'SELECT * FROM usuarios_hardware WHERE email = ?';
        lojaHardwareCONN.query(queryCheckEmail, [email], (error, results) => {
            if (error) throw error;
            if (results.length > 0) {
                res.status(400).json({ message: 'O email já está em uso.' });
                return;
            }

            // Verificar se o cpf já existe
            const queryCheckCpf = 'SELECT * FROM usuarios_hardware WHERE cpf = ?';
            lojaHardwareCONN.query(queryCheckCpf, [cpf], (error, results) => {
                if (error) throw error;
                if (results.length > 0) {
                    res.status(400).json({ message: 'O CPF já está registrado.' });
                    return;
                }

                // Criptografe a senha antes de inseri-la no banco de dados
                const saltRounds = 10;
                bcrypt.hash(senha, saltRounds, (error, hashedPassword) => {
                    if (error) throw error;

                    const queryInsert = 'INSERT INTO usuarios_hardware SET admin = ?, ativo = ?, usuario = ?, nome = ?, email = ?, cpf = ?, senha = ?, rua = ?, bairro = ?, numero = ?, cep = ?, cidade = ?, estado = ?';
                    lojaHardwareCONN.query(queryInsert, [admin, ativo, usuario, nome, email, cpf, hashedPassword, rua, bairro, numero, cep, cidade, estado], (error, results) => {
                        if (error) throw error;
                        res.json({ message: 'Usuário adicionado com sucesso' });
                    });
                });
            });
        });
    });
});

// Consulta para produto filtrado pelo id
app.get('/editProduct/:id', (req, res) => {
    const { id } = req.params;
    lojaHardwareCONN.query('SELECT * FROM produtos_hardware WHERE id = ?', [id], (error, results) => {
        if (error) throw error;
        if (results[0]) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: 'Produto não encontrado' });
        }
    });
});

// Atualizar um produto
app.put('/editProduct/:id', (req, res) => {
    const { id } = req.params;
    const { ativo, nome, descricao, preco, imagem_url } = req.body;
    const queryUpdate = 'UPDATE produtos_hardware SET ativo = ?, nome = ?, descricao = ?, preco = ?, imagem_url = ? WHERE id = ?';
    lojaHardwareCONN.query(queryUpdate, [ativo, nome, descricao, preco, imagem_url, id], (error, results) => {
        if (error) throw error;
        res.json({ message: 'Produto atualizado com sucesso' });
    });
});

// Verificar se um nome do produto já existe
app.post('/checkProduct/:id', (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    lojaHardwareCONN.query('SELECT * FROM produtos_hardware WHERE nome = ? AND id != ?', [nome, id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'Produto com esse nome já existe.' });
        } else {
            res.json({ message: 'Nome do produto disponível.' });
        }
    });
});

// Verificar se uma URL de imagem já está sendo usada
app.post('/checkUrlImg/:id', (req, res) => {
    const { id } = req.params;
    const { img } = req.body;
    lojaHardwareCONN.query('SELECT * FROM produtos_hardware WHERE imagem_url = ? AND id != ?', [img, id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.status(400).json({ message: 'Imagem já está sendo utilizada.' });
        } else {
            res.json({ message: 'Imagem disponível.' });
        }
    });
});

app.listen(4000, () => {
    console.log('API rodando na porta 4000');
});