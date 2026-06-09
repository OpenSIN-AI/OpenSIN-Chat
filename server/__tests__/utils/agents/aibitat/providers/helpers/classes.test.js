// SPDX-License-Identifier: MIT
const InheritMultiple = require("../../../../../../utils/agents/aibitat/providers/helpers/classes");

describe("InheritMultiple", () => {
  test("creates a class that inherits from multiple base classes", () => {
    class A {
      aProp = 1;
    }
    class B {
      bProp = 2;
    }
    const Combined = InheritMultiple([A, B]);
    const instance = new Combined();
    expect(instance).toBeInstanceOf(Combined);
    expect(instance.aProp).toBe(1);
    expect(instance.bProp).toBe(2);
  });

  test("assigns instance properties from all bases", () => {
    class X {
      xVal = "x";
    }
    class Y {
      yVal = "y";
    }
    const Combined = InheritMultiple([X, Y]);
    const instance = new Combined();
    expect(instance.xVal).toBe("x");
    expect(instance.yVal).toBe("y");
  });

  test("assigns prototype methods from all bases", () => {
    class A {
      greet() { return "hello"; }
    }
    class B {
      farewell() { return "bye"; }
    }
    const Combined = InheritMultiple([A, B]);
    const instance = new Combined();
    expect(instance.greet()).toBe("hello");
    expect(instance.farewell()).toBe("bye");
  });

  test("excludes constructor from prototype copy", () => {
    class A {
      constructor() { this.a = 1; }
      greet() { return "hi"; }
    }
    const Combined = InheritMultiple([A]);
    expect(Combined.prototype.constructor).not.toBe(A.prototype.constructor);
    expect(Combined.prototype.greet).toBe(A.prototype.greet);
  });

  test("works with empty bases array", () => {
    const Combined = InheritMultiple([]);
    const instance = new Combined();
    expect(instance).toBeDefined();
  });

  test("works with single base", () => {
    class Solo {
      val = 42;
      echo() { return this.val; }
    }
    const Combined = InheritMultiple([Solo]);
    const instance = new Combined();
    expect(instance.val).toBe(42);
    expect(instance.echo()).toBe(42);
  });

  test("works with 2+ bases", () => {
    class A { a = 1; ma() { return "a"; } }
    class B { b = 2; mb() { return "b"; } }
    class C { c = 3; mc() { return "c"; } }
    const Combined = InheritMultiple([A, B, C]);
    const instance = new Combined();
    expect(instance.a).toBe(1);
    expect(instance.b).toBe(2);
    expect(instance.c).toBe(3);
    expect(instance.ma()).toBe("a");
    expect(instance.mb()).toBe("b");
    expect(instance.mc()).toBe("c");
  });

  test("method resolution: last base wins for same-named methods", () => {
    class First {
      shared() { return "first"; }
    }
    class Second {
      shared() { return "second"; }
    }
    const Combined = InheritMultiple([First, Second]);
    const instance = new Combined();
    expect(instance.shared()).toBe("second");
  });
});
