#ignoretasktree #implementation-work-package

**AssignedTo**:: [[Persons/Markarjan Andranik]]
**AssociatedTo**:: [[Backend Python Tech Lead (Django_PostgreSQL) - Montes Auri - Маркарян Андраник.pdf]], [[Interview - Markarjan]]

PRGS:[[]]
## 1. Real hands-on experience (2–7 min)

### Project ownership
- [x] Ask to describe the **last backend system** where the candidate made **key technical decisions**
- [x] Clarify:
  - [x] What exactly was their responsibility
  - [x] What parts they implemented personally
### Production exposure

- [x] Ask about the **most painful production issue**
  - [x] What broke
  - [x] How it was detected
  - [x] How it was fixed
- [x] Ask what they would do **differently now**
## 2. Core backend fundamentals (7–17 min)

### Django / ORM

- [x] How do you avoid **N+1 queries** in Django?
- [x] In which cases does Django ORM become inefficient?
    - [x] What do you do instead?
- [x] How do you approach **safe schema migrations** in production?
### PostgreSQL

- [ ] When are **transactions mandatory**?
- [ ] What is **row-level locking**?
  - [ ] When can it become dangerous?
- [ ] Example of a query or DB change that caused performance issues
### API & reliability

- [x] What is **idempotency**?
  - [x] Where is it critical?
- [x] How do you handle:
  - [x] Request retries
  - [x] Duplicate requests
  - [x] Timeouts from external services
## 3. System design mini-case (17–25 min)

### Case (same for all candidates)

> You have a backend service handling **balances and transfers**.  Clients sometimes retry requests due to network issues.  Losing or duplicating money is unacceptable.

### Questions

- [ ] Where can things go wrong in this flow?
- [ ] How would you implement **idempotency**?
  - [ ] What key would you use?
  - [ ] Where would you store state?
- [ ] How do you ensure **consistency**?
- [ ] What invariants must always hold?
- [ ] How would you observe and debug this in production?

## 4. Candidate-specific deep dive (25–30 min)

### CV validation
- [ ] Pick 2–3 **claims from the CV**
- [ ] For each claim:
  - [ ] Where was this used?
  - [ ] Why was this solution chosen?
  - [ ] What alternatives were considered?

#### Декомпозиция монолита в микросервисную архитектуру

- [x] Как вы определяли границы сервисов при декомпозиции монолита?
- [x] Какие критерии использовали: доменные границы, нагрузка, SLA, структура команд?
- [ ] Были ли архитектурные решения, которые впоследствии пришлось пересматривать? Почему?

---

#### Архитектурные проблемы в платежной платформе

- [x] Приведите конкретный пример сложной технической проблемы (идемпотентность, двойные списания, race condition, проблемы с Kafka или БД).
- [ ] Как выглядела проблема на уровне системы?
- [ ] Какие архитектурные решения были приняты для её устранения?
- [ ] Как вы проверяли, что решение действительно устойчиво?

---

#### Разработка внутреннего фреймворка для интеграций

- [x] Какие архитектурные принципы были заложены в основу фреймворка?
- [x] Как обеспечивалась повторная используемость компонентов?
- [x] Как контролировалось качество новых интеграций?
- [x] Как фреймворк помог сократить time-to-market?
### Depth check

- [ ] Ask for a concrete failure or limitation
- [ ] Ask how they validated correctness or safety

## 5. Interview close (30 min)

- [ ] Thank candidate and close the session