import { describe, it, expect } from "vitest";
import { exportToQti, parseQtiXml } from "@/lib/qtiUtils";
import type { QuestionBankItem } from "@/hooks/useQuestionBank";

const makeMcq = (overrides?: Partial<QuestionBankItem>): QuestionBankItem => ({
  id: "q1",
  bank_id: "b1",
  question_text: "What is 2+2?",
  question_type: "multiple_choice",
  points: 5,
  difficulty_level: "easy",
  explanation: null,
  options: [
    { option_text: "3", is_correct: false },
    { option_text: "4", is_correct: true },
    { option_text: "5", is_correct: false },
  ],
  matching_pairs: null,
  ordering_items: null,
  fill_blanks: null,
  likert_config: null,
  tags: [],
  learning_outcome_ids: [],
  created_by: null,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("QTI Export", () => {
  it("generates valid XML with assessment wrapper", () => {
    const xml = exportToQti([makeMcq()], "Test Bank");
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("assessmentTest");
    expect(xml).toContain("Test Bank");
  });

  it("exports multiple choice questions with correct response", () => {
    const xml = exportToQti([makeMcq()], "MCQ Bank");
    expect(xml).toContain("choiceInteraction");
    expect(xml).toContain("What is 2+2?");
    expect(xml).toContain("simpleChoice");
    expect(xml).toContain("correctResponse");
  });

  it("exports essay questions as extendedTextInteraction", () => {
    const q = makeMcq({ question_type: "essay", question_text: "Discuss climate change" });
    const xml = exportToQti([q], "Essay Bank");
    expect(xml).toContain("extendedTextInteraction");
    expect(xml).toContain("Discuss climate change");
  });

  it("exports fill-in-blank as textEntryInteraction", () => {
    const q = makeMcq({ question_type: "fill_in_blank", question_text: "The capital of France is ___" });
    const xml = exportToQti([q], "FIB Bank");
    expect(xml).toContain("textEntryInteraction");
  });

  it("exports matching questions with simpleMatchSet", () => {
    const q = makeMcq({
      question_type: "matching",
      matching_pairs: [
        { left: "H2O", right: "Water" },
        { left: "NaCl", right: "Salt" },
      ],
    });
    const xml = exportToQti([q], "Match Bank");
    expect(xml).toContain("matchInteraction");
    expect(xml).toContain("H2O");
    expect(xml).toContain("Water");
  });

  it("exports ordering questions with orderInteraction", () => {
    const q = makeMcq({
      question_type: "ordering",
      ordering_items: [{ text: "First" }, { text: "Second" }, { text: "Third" }],
    });
    const xml = exportToQti([q], "Order Bank");
    expect(xml).toContain("orderInteraction");
    expect(xml).toContain("First");
  });

  it("escapes XML special characters", () => {
    const q = makeMcq({ question_text: 'Is 3 < 5 & 5 > 3? "Yes"' });
    const xml = exportToQti([q], "Special Chars");
    expect(xml).toContain("&lt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&gt;");
    expect(xml).toContain("&quot;");
  });

  it("includes points in outcomeDeclaration", () => {
    const q = makeMcq({ points: 10 });
    const xml = exportToQti([q], "Points");
    expect(xml).toContain("<value>10</value>");
  });

  it("handles true/false questions", () => {
    const q = makeMcq({
      question_type: "true_false",
      options: [
        { option_text: "True", is_correct: true },
        { option_text: "False", is_correct: false },
      ],
    });
    const xml = exportToQti([q], "TF Bank");
    expect(xml).toContain("choiceInteraction");
    expect(xml).toContain("True");
    expect(xml).toContain("False");
  });
});

describe("QTI Import", () => {
  it("parses MCQ from QTI XML", () => {
    const xml = `<?xml version="1.0"?>
      <assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">
        <assessmentItem identifier="q1" title="Capital question">
          <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
            <correctResponse><value>choice_1</value></correctResponse>
          </responseDeclaration>
          <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
            <defaultValue><value>5</value></defaultValue>
          </outcomeDeclaration>
          <itemBody>
            <choiceInteraction responseIdentifier="RESPONSE" maxChoices="1">
              <prompt>What is the capital of France?</prompt>
              <simpleChoice identifier="choice_0">London</simpleChoice>
              <simpleChoice identifier="choice_1">Paris</simpleChoice>
              <simpleChoice identifier="choice_2">Berlin</simpleChoice>
            </choiceInteraction>
          </itemBody>
        </assessmentItem>
      </assessmentTest>`;
    const questions = parseQtiXml(xml);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_type).toBe("multiple_choice");
    expect(questions[0].question_text).toContain("capital of France");
    expect(questions[0].points).toBe(5);
  });

  it("parses essay from QTI XML", () => {
    const xml = `<?xml version="1.0"?>
      <assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">
        <assessmentItem identifier="q1" title="Essay question">
          <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>
          <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
            <defaultValue><value>20</value></defaultValue>
          </outcomeDeclaration>
          <itemBody>
            <extendedTextInteraction responseIdentifier="RESPONSE">
              <prompt>Discuss global warming</prompt>
            </extendedTextInteraction>
          </itemBody>
        </assessmentItem>
      </assessmentTest>`;
    const questions = parseQtiXml(xml);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_type).toBe("essay");
    expect(questions[0].points).toBe(20);
  });

  it("round-trips MCQ export then import", () => {
    const original = [makeMcq()];
    const xml = exportToQti(original, "Round Trip");
    const parsed = parseQtiXml(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].question_type).toBe("multiple_choice");
    expect(parsed[0].question_text).toContain("2+2");
  });

  it("handles empty XML gracefully", () => {
    const questions = parseQtiXml("<assessmentTest></assessmentTest>");
    expect(questions).toHaveLength(0);
  });

  it("identifies true/false from QTI", () => {
    const xml = `<?xml version="1.0"?>
      <assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">
        <assessmentItem identifier="q1" title="TF question">
          <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
            <correctResponse><value>choice_0</value></correctResponse>
          </responseDeclaration>
          <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
            <defaultValue><value>1</value></defaultValue>
          </outcomeDeclaration>
          <itemBody>
            <choiceInteraction responseIdentifier="RESPONSE" maxChoices="1">
              <prompt>The sky is blue</prompt>
              <simpleChoice identifier="choice_0">True</simpleChoice>
              <simpleChoice identifier="choice_1">False</simpleChoice>
            </choiceInteraction>
          </itemBody>
        </assessmentItem>
      </assessmentTest>`;
    const questions = parseQtiXml(xml);
    expect(questions[0].question_type).toBe("true_false");
  });
});
