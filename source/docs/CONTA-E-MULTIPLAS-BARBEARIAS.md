# Conta e múltiplas barbearias

## Primeiro acesso

1. A pessoa abre a tela de login.
2. Escolhe **Criar minha barbearia**.
3. Informa nome, nome da primeira barbearia, usuário, e-mail de recuperação e senha.
4. A conta do proprietário e a primeira barbearia são criadas juntas.
5. A primeira barbearia nasce sem clientes, agendamentos ou movimentações de demonstração.
6. O sistema abre o onboarding dessa barbearia.
7. Após concluir as 10 etapas, a pessoa vê a tela de sucesso e entra no painel daquela unidade.

## Dono que abre outra unidade

Em **Configurações > Minhas barbearias**, o proprietário pode escolher **Adicionar nova barbearia**.

A nova unidade:

- usa a mesma conta e a mesma senha do proprietário;
- recebe outro `business_id`;
- nasce vazia;
- possui onboarding, serviços, horários, clientes, agenda, financeiro e página próprios;
- abre diretamente o onboarding da nova unidade.

O fluxo equivalente do preview foi corrigido na v0.8.0 para que o botão não seja apenas visual.

## Troca de unidade

Quando a conta possui mais de uma barbearia, o menu lateral pode mostrar **Trocar barbearia**. Também é possível trocar pela área **Minhas barbearias**.

O servidor valida se o usuário realmente possui membership ativo no `business_id` solicitado antes de trocar a sessão.

## Última unidade usada

A conta guarda a última unidade utilizada. No próximo login, o sistema tenta restaurá-la. Se o vínculo não estiver mais ativo, escolhe outro negócio permitido.

## Regras de isolamento

- Cada barbearia usa `business_id` diferente.
- Nova unidade nunca copia clientes, agenda ou caixa da unidade atual.
- O usuário não escolhe cargo no login.
- `business_members` determina o papel em cada negócio.
- A mesma conta pode ter papéis diferentes em negócios diferentes.
- Slugs públicos precisam ser únicos, mesmo quando nomes comerciais se repetem.
- Trocar de unidade recarrega o contexto inteiro; nenhuma tela pode continuar exibindo dados do negócio anterior.
