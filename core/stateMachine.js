// core/stateMachine.js
class StateMachine {
  constructor() {
    this.currentState = 'IDLE';
    this.states = {
      'IDLE': { description: 'Waiting for messages', canProcess: true },
      'MESSAGE_DETECTED': { description: 'New message received', canProcess: true },
      'VALIDATION': { description: 'Checking message validity', canProcess: true },
      'DECISION': { description: 'Deciding response', canProcess: true },
      'TYPING': { description: 'Simulating typing', canProcess: false },
      'RESPOND': { description: 'Sending response', canProcess: false },
      'REACTION': { description: 'Adding reaction', canProcess: false },
      'COOLDOWN': { description: 'Cooling down', canProcess: false },
      'SILENT': { description: 'No action taken', canProcess: true },
      'ERROR': { description: 'Error occurred', canProcess: false }
    };
    
    this.stateHistory = [];
    this.maxHistoryLength = 50;
    this.transitionCount = 0;
  }

  transitionTo(newState) {
    if (!this.states[newState]) {
      console.error(`❌ Invalid state: ${newState}`);
      return false;
    }

    const oldState = this.currentState;
    
    // Check if transition is allowed
    if (this.states[oldState] && this.states[oldState].canProcess === false && 
        newState !== 'ERROR' && newState !== 'IDLE') {
      console.warn(`⚠️ Blocked transition from ${oldState} to ${newState}`);
      return false;
    }

    this.currentState = newState;
    this.transitionCount++;
    
    const transitionRecord = {
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      count: this.transitionCount
    };
    
    this.stateHistory.push(transitionRecord);
    
    // Trim history if too long
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }

    // Log only important transitions
    const importantTransitions = ['ERROR', 'SILENT', 'RESPOND', 'IDLE'];
    if (importantTransitions.includes(newState) || Math.random() < 0.1) {
      console.log(`🔄 State: ${oldState} → ${newState} (${this.states[newState].description})`);
    }
    
    return true;
  }

  getCurrentState() {
    return {
      state: this.currentState,
      description: this.states[this.currentState].description,
      canProcess: this.states[this.currentState].canProcess
    };
  }

  getStateInfo() {
    return {
      current: this.getCurrentState(),
      history: this.stateHistory.slice(-10),
      totalTransitions: this.transitionCount,
      uptime: Date.now() - (this.stateHistory[0]?.timestamp || Date.now())
    };
  }

  isInState(state) {
    return this.currentState === state;
  }

  canAcceptMessages() {
    return this.states[this.currentState].canProcess;
  }

  reset() {
    const oldState = this.currentState;
    this.currentState = 'IDLE';
    this.stateHistory = [];
    this.transitionCount = 0;
    console.log(`🔄 State machine reset from ${oldState} to IDLE`);
    return true;
  }

  getRecentActivity() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    const lastMinute = this.stateHistory.filter(
      record => record.timestamp >= oneMinuteAgo
    ).length;
    
    const lastFiveMinutes = this.stateHistory.filter(
      record => record.timestamp >= fiveMinutesAgo
    ).length;
    
    return {
      lastMinute: lastMinute,
      lastFiveMinutes: lastFiveMinutes,
      totalTransitions: this.transitionCount,
      currentStateDuration: now - (this.stateHistory[this.stateHistory.length - 1]?.timestamp || now)
    };
  }
}

module.exports = StateMachine;
