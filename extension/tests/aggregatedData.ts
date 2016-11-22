

describe("increment", function () {
  var databaseManager = new DatabaseManager();

  it("should work on empty history", function () {
    var now = new Date();
    var history = <History>{};
    databaseManager.increment(history, 123, DatabaseManager.shortDate(now));
    expect(history).not.toBeNull();
    expect(history.lastDate).toBe(now.getTime());
  });

  it("should aggregate the values", function () {
    var now = new Date();
    var history = <History>{};
    databaseManager.increment(history, 123, DatabaseManager.shortDate(now));
    databaseManager.increment(history, 123, DatabaseManager.shortDate(now));

    expect(history.daily[0]).toBe(246);
    expect(history.monthly[0]).toBe(246);
  });

  it("should aggregate over 1000 hours", function () {
    var now = new Date(2000, 0, 1);
    var history = <History>{
      lastDate: DatabaseManager.shortDate(now),
      daily: <Number[]>[],
      monthly: <Number[]>[]
    };
    for (var i = 0; i < 1000; i++) {
      databaseManager.increment(history, 10, DatabaseManager.shortDate(now));
      now.setHours(now.getHours() + 1);
    }
    expect(JSON.stringify(history)).toBe(246);
    //Expected '{"lastPush":980809200000,
    //"daily":[10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    //"monthly":[290,310,300,310,300,310,310,300,310,300,310,300]}' to be 246.

  });
})

