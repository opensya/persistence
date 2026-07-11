import {
  createAuditLogMetadata,
  createOutboxMetadata,
  defineTable,
} from "@opensya/persistence";

export const usersMetadata = defineTable({
  name: "users",
  collectionName: "playground_users",
  columns: [
    {
      name: "id",
      columnName: "id",
      type: "uuid",
      nullable: false,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      validators: [],
    },
    {
      name: "email",
      columnName: "email",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: true,
      validators: [
        {
          name: "email-format",
          validate(value) {
            return typeof value === "string" && value.includes("@")
              ? { valid: true }
              : { valid: false, message: "Enter a valid email address." };
          },
        },
      ],
    },
    {
      name: "secret",
      columnName: "secret",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: false,
      hidden: true,
      validators: [],
    },
    {
      name: "createdAt",
      columnName: "created_at",
      type: "timestamp",
      nullable: false,
      primaryKey: false,
      unique: false,
      default: () => new Date(),
      validators: [],
    },
  ],
  relations: [
    {
      name: "posts",
      kind: "oneToMany",
      target: "posts",
      foreignKey: "authorId",
    },
  ],
  tableValidators: [],
  audit: { enabled: true, excludedFields: ["secret"] },
});

export const postsMetadata = defineTable({
  name: "posts",
  collectionName: "playground_posts",
  columns: [
    {
      name: "id",
      columnName: "id",
      type: "uuid",
      nullable: false,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      validators: [],
    },
    {
      name: "authorId",
      columnName: "author_id",
      type: "uuid",
      nullable: false,
      primaryKey: false,
      unique: false,
      validators: [],
    },
    {
      name: "title",
      columnName: "title",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: false,
      validators: [],
    },
    {
      name: "publishedAt",
      columnName: "published_at",
      type: "timestamp",
      nullable: false,
      primaryKey: false,
      unique: false,
      default: () => new Date(),
      validators: [],
    },
  ],
  relations: [
    {
      name: "author",
      kind: "manyToOne",
      target: "users",
      foreignKey: "authorId",
    },
  ],
  tableValidators: [],
  audit: { enabled: true },
  indexes: [
    {
      name: "playground_posts_author_published_idx",
      fields: ["authorId", "publishedAt"],
      unique: false,
    },
  ],
});

export const auditLogsMetadata = createAuditLogMetadata({
  collectionName: "playground_audit_logs",
});

export const outboxEventsMetadata = createOutboxMetadata({
  collectionName: "playground_outbox_events",
});
