module {
  public type Actor = {
    nextServiceId : Nat;
    nextTransactionId : Nat;
  };

  public func run(old : Actor) : Actor {
    old;
  };
};
