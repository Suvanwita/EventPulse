function safeUser(user) {
  if (!user) {
    return user;
  }

  if (Array.isArray(user)) {
    return user.map(safeUser);
  }

  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = safeUser;
