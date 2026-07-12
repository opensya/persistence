import { schemaCreationScenario } from "./scenarios/00-schema-creation.js";
import { crudAndValidationScenario } from "./scenarios/01-crud-and-validation.js";
import { relationsAndSerializationScenario } from "./scenarios/02-relations-and-serialization.js";
import { auditAndDomainEventsScenario } from "./scenarios/03-audit-and-domain-events.js";
import { cursorPaginationScenario } from "./scenarios/04-cursor-pagination.js";

const scenarios = [
  schemaCreationScenario,
  crudAndValidationScenario,
  relationsAndSerializationScenario,
  auditAndDomainEventsScenario,
  cursorPaginationScenario,
];

console.log("OpenSya Persistence playground\n");

for (const scenario of scenarios) {
  await scenario();
}

console.log(`\n${scenarios.length} production scenarios passed.`);
